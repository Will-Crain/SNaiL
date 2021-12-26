class Sector {
	constructor(scope) {
		let {name, tasks={}, spawnQueue=[], spawnHash={}, eventFlags={}, level=0, setup=false} = scope

		this.name = name

		this.tasks = tasks

		this.spawnQueue = spawnQueue
		this.spawnHash = spawnHash

		this.eventFlags = eventFlags
		this.level = level
		this.setup = setup

		return this
	}

	// Setup
	init() {
		let spawnLocation = _.first(Game.rooms[this.name].find(FIND_MY_SPAWNS)).pos
		let targetRoom = Game.rooms[this.name]

		let controllerPath = targetRom.findPath(spawnLocation, targetRoom.controller, {ignoreCreeps: true, range: 1})
		let containerPos = new RoomPosition(controllerPath[controllerPath.length-1].x, controllerPath[controllerPath.length-1].y, this.name)
		let linkPos = new RoomPosition(controllerPath[controllerPath.length-2].x, controllerPath[controllerPath.length-2].y, this.name)

		let upgradeTaskInfo = {
			controllerID:		targetRoom.controller.id,
			controllerPos:		RoomPosition.serialize(targetRoom.controller.pos),
			desiredThroughput:	15,
			containerPos:		RoomPosition.serialize(containerPos),
			linkPos:			RoomPosition.serialize(linkPos),
			static:				true
		}
		let upgradeTask = new TASKS.UPGRADING({
			sectorName:		this.name,
			id:				makeID(),
			taskInfo:		upgradeTaskInfo
		})
		this.addTask(upgradeTask)

		let sources = Game.rooms[this.name].find(FIND_SOURCES)

		for (let sourceIdx in sources) {
			let targetSource = sources[sourceIdx]

			let fromPos = spawnLocation
			let path = targetRoom.findPath(fromPos, targetSource.pos, {ignoreCreeps: true, range: 1})

			let taskInfo = {
				sourceID:	targetSource.id,
				sourcePos:	RoomPosition.serialize(targetSource.pos),
				sourceAmt:	targetSource.energyCapacity,
				path:		Room.serializePath(path),
				pathLength:	path.length,
				standPos:	RoomPosition.serialize(new RoomPosition(_.last(path).x, _.last(path).y, targetSource.pos.roomName)),
				originPos:	RoomPosition.serialize(fromPos)
			}

			let newTask = new TASKS.MINING({
				sectorName: 	this.name,
				id:				makeID(),
				taskInfo:		taskInfo,
				priorityOffset:	path.length,
				unloadOrder:	[RoomPosition.serialize(spawnLocation), RoomPosition.serialize(containerPos)]
			})
			this.addTask(newTask)
		}
	}
	plan() {
		let roomObj = Game.rooms[this.name]
		let roomTerrain = roomObj.getTerrain()

		let distanceWalls = new PathFinder.CostMatrix
		let distanceExits = new PathFinder.CostMatrix
		let distanceWallsExits = new PathFinder.CostMatrix
		
		// Generate distanceWalls
		for (let y = 0; y < 50; y += 1) {
			for (let x = 0; x < 50; x += 1) {
				let terrainAt = roomTerrain.get(x, y)
				
				// Are we a wall?
				if (terrainAt == TERRAIN_MASK_WALL) {
					distanceWalls.set(x, y, 0)
				}
				// Otherwise, do distanceWall calculation
				else {
					let toInclude = []
					if (y-1 >= 0) {
						toInclude.push(distanceWalls.get(x  , y-1))
						if (x-1 >= 0) {
							toInclude.push(distanceWalls.get(x-1, y-1))
						}
						if (x+1 < 50) {
							toInclude.push(distanceWalls.get(x+1, y-1))
						}
					}
					if (x-1 >= 0) {
						toInclude.push(distanceWalls.get(x-1, y  ))
					}
					
					let minWalls = 1+Math.min(...toInclude)
					distanceWalls.set(x, y, minWalls)
				}
			}
		}
		for (let y = 49; y >= 0; y -= 1) {
			for (let x = 49; x >= 0; x -= 1) {
				let toInclude = [distanceWalls.get(x, y)]
				if (y+1 < 50) {
					toInclude.push(distanceWalls.get(x  , y+1)+1)
					if (x+1 < 50) {
						toInclude.push(distanceWalls.get(x+1, y+1)+1)
					}
					if (x-1 >= 0) {
						toInclude.push(distanceWalls.get(x-1, y+1)+1)
					}
				}
				if (x+1 < 50) {
					toInclude.push(distanceWalls.get(x+1, y  )+1)
				}
				let minWalls = Math.min(...toInclude)

				distanceWalls.set(x, y, minWalls)
			}
		}

		// Generate distanceExits
		let toVisit = roomObj.find(FIND_EXIT)
		let hash = {}

		let depth = 0
		let done = false
		while (!done) {
			let next = []

			for (let idx in toVisit) {
				let roomPos = toVisit[idx]

				distanceExits.set(roomPos.x, roomPos.y, depth)

				let adjacent = roomPos.getAdjacent({serialize: false, checkTerrain: true})
				for (let adjIdx in adjacent) {
					let serPos = RoomPosition.serialize(adjacent[adjIdx])
					if (!_.has(hash, serPos)) {
						hash[serPos] = depth
						next.push(adjacent[adjIdx])
					}
				}
			}

			if (next.length == 0) {
				done = true
			}
			depth += 1
			toVisit = next
		}
		for (let x = 0; x < 50; x += 1) {
			for (let y = 0; y < 50; y += 1) {
				if (roomTerrain.get(x, y) == TERRAIN_MASK_WALL) {
					distanceExits.set(x, y, 0)
				}
				else if ([0, 1].includes(distanceExits.get(x, y))) {
					distanceExits.set(x, y, 255)
				}
				else {
					distanceExits.set(x, y, distanceExits.get(x, y)-1)
				}
			}
		}
		
		// Make min(distanceWalls, distanceExits)
		for (let x = 0; x < 50; x += 1) {
			for (let y = 0; y < 50; y += 1) {
				if (roomTerrain.get(x, y) == TERRAIN_MASK_WALL) {
					distanceWallsExits.set(x, y, 1)
				}
				else {
					if (distanceWalls.get(x, y) == 255 || distanceExits.get(x, y) == 255) {
						distanceWallsExits.set(x, y, 255)
					}
					else {
						distanceWallsExits.set(x, y, 5*Math.min(
							distanceWalls.get(x, y),
							distanceExits.get(x, y)
						))
					}
				}
			}
		}

		let startLocations = {
			1: 	new RoomPosition( 0,  0, this.name),
			3:	new RoomPosition(49,  0, this.name),
			5:	new RoomPosition(49, 49, this.name),
			7:	new RoomPosition( 0, 49, this.name)
		}
		let endLocations = {
			1:	new RoomPosition(49,  0, this.name),
			3:	new RoomPosition(49, 49, this.name),
			5:	new RoomPosition( 0, 49, this.name),
			7:	new RoomPosition( 0,  0, this.name)
		}
		let exits = {
			1:		Game.rooms[this.name].find(FIND_EXIT_TOP),
			3:		Game.rooms[this.name].find(FIND_EXIT_RIGHT),
			5:		Game.rooms[this.name].find(FIND_EXIT_BOTTOM),
			7:		Game.rooms[this.name].find(FIND_EXIT_LEFT)
		}
		let wallsPaths = {}

		for (let exitID in exits) {
			let startLocation = startLocations[exitID]
			let endLocation = endLocations[exitID]
			let path = PathFinder.primitivePathfind(startLocation, endLocation, distanceWallsExits)
			wallsPaths[exitID] = path
			RoomVisual.drawPath(path, 'sim')
		}
		RoomVisual.drawGrid(distanceWallsExits, {reverse: false, cutoffMax: 255, cutoffMin: 1})
		return distanceWallsExits
	}

	run() {
		let satisfaction = this.runTasks()
		if (satisfaction == 0) {
			// Do we already have a SCOUTING task?
			let scoutTask = _.find(this.tasks, s => s.type == 'SCOUTING')
			// if (!scoutTask) {
			// 	// Lets make a scout task
			// 	let newTask = 
			// }
		}
		this.runSpawns()

		// this.checkEvents()

		// this.draw()
	}

	// Fancy
	draw() {
		console.log('drawing')
		let newVisual = new RoomVisual(this.name).text(`${this.name}\tTest`, 24, 10, {
			'font':		'30px',
			'color':	'#FFFFFF',
			'stroke':	'#000000',
			'align':	'center',
			'opacity': 	0.8,
			'backgroundColor':		'#777777',
			'backgroundPadding':	0.5
		})
	}

	// Tasks
	addTask(task) {
		Imperium.sectors[this.name].tasks[task.id] = task
	}
	runTasks() {
		let satisfaction = 0

		for (let taskID in this.tasks) {
			let task = Imperium.sectors[this.name].tasks[taskID]

			// Check to see if we've been initialized
			if (!_.has(task.taskInfo, 'init')) {
				Imperium.sectors[this.name].tasks[taskID].taskInfo['init'] = true
				Imperium.sectors[this.name].tasks[taskID].init()
			}

			Imperium.sectors[this.name].tasks[taskID].run()
			satisfaction = Math.max(Imperium.sectors[this.name].tasks[taskID].satisfaction, satisfaction)
		}

		return satisfaction
	}

	// Spawning
	addCreep(scope) {
		let {creepName, creepBody, memObject, priority} = scope

		// Hash exists for quick lookups
		if (_.has(this.spawnHash, creepName)) {
			return false
		}

		memObject['home'] = this.name

		let creepObj = {
			body:		creepBody,
			memory:		memObject,
			name:		creepName,
			priority:	priority
		}

		this.spawnQueue.push(creepObj)
		this.spawnHash[creepName] = 0

		return true
	}
	runSpawns() {

		// Make sure we have something in the queue
		if (this.spawnQueue.length == 0) {
			return
		}

		// Group creeps by task type, sorted by basePriority
		// Take creep from lowest basePriority then (if multiple tasks) lowest priorityOffset
		let thisTasks = this.tasks
		this.spawnQueue = _.sortByAll(this.spawnQueue, function(s) {
			let task = thisTasks[s.memory.taskID]

			let basePriority = TASKS.Task.basePriorities[task.type]
			let priorityOffset = task.priorityOffset
			let creepPriority = s.priority

			return [basePriority, priorityOffset, creepPriority]
		})

		let availableSpawns = _.filter(Game.rooms[this.name].find(FIND_MY_STRUCTURES), s => s.structureType == STRUCTURE_SPAWN && !s.spawning)
		for (let spawnIdx in availableSpawns) {
			let spawner = availableSpawns[spawnIdx]

			// Make sure we're not processing more creeps than we have in the queue
			if (this.spawnQueue.length <= spawnIdx) {
				return
			}

			let targetCreep = this.spawnQueue[spawnIdx]
			let spawnCheck = spawner.createCreep(targetCreep.body, targetCreep.name, targetCreep.memory)
			let illegalErrors = [-1, -3, -10, -14]

			if (illegalErrors.includes(spawnCheck)) {
				console.log(`${targetCreep.name} can't spawn in ${this.name}\t${spawnCheck}`)
				continue
			}
			let warnErrors = [-4, -6]
			if (warnErrors.includes(spawnCheck)) {
				continue
			}

			// Remove from spawn hash and queue
			this.spawnQueue.shift()
			delete this.spawnHash[targetCreep.name]
		}
	}
}
global.Sector = Sector