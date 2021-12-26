class MINING extends Task {
	/* MINING taskInfo expects
	{
		str sourceID,		Source ID
		str sourcePos,		Serialized source position
		int sourceAmt,		Source amount
		str standPos,		Serialized container position
		str path,			Serialized path
		int pathLength,		Path length,
		str originPos		Serialized origin position (storage, spawn, etc)
	}
	*/
	constructor (scope={}) {
		let {sectorName, id, priorityOffset=0, taskInfo={}, creeps={}, structures={}} = scope
		super()

		this.sectorName = sectorName
		this.id = id

		this.priorityOffset = priorityOffset

		this.taskInfo = taskInfo
		this.creeps = creeps

		this.satisfaction = 0

		this.type = 'MINING'
	}
	getCreeps(type, scope={}) {
		// let sectorFlags = Imperium.sectors[this.sectorName].flags
		let coreRoom = Game.rooms[this.sectorName]
		let coreRoomCapacity = coreRoom.energyCapacityAvailable

		let requiredParts = new CreepBody()
		let numCreeps = 1

		let [perTarget, targetPart, maxTargetPart, maxCreeps] = [0, '', 0, 0]
		switch (type) {
			case MINING.BODIES.MINER:
				let {resourceAmt=3000, timeToMine=300, resource=RESOURCE_ENERGY} = scope

				targetPart = WORK
				maxTargetPart = Math.ceil(resourceAmt / MINING.lookup[resource] / timeToMine)
				
				perTarget = {
					[CARRY]:	0,
					[MOVE]:		1/4
				}

				let roomPos = RoomPosition.parse(this.taskInfo.sourcePos)
				maxCreeps = roomPos.getAdjacent({checkTerrain: true, serialized: true}).length
				break

			case MINING.BODIES.HAULER:
				let {actualPerTick, pathLength} = scope
				targetPart = CARRY
				maxTargetPart = Math.ceil(((2 * pathLength) * actualPerTick) / CARRY_CAPACITY)
				perTarget = {
					[MOVE]:		1
				}

				maxCreeps = 10
				break
		}

		requiredParts.set(targetPart, maxTargetPart)
		for (let part in perTarget) {
			requiredParts.set(part, Math.ceil(perTarget[part]*maxTargetPart))
		}

		let solved = false
		while (!solved) {

			let newParts = {
				[targetPart]:	Math.ceil(maxTargetPart/numCreeps)
			}
			for (let part in perTarget) {
				newParts[part] = Math.ceil(maxTargetPart*perTarget[part]/numCreeps)
			}
		
			requiredParts = new CreepBody()
			for (let part in newParts) {
				requiredParts.set(part, newParts[part])
			}

			if (!requiredParts.invalid && requiredParts.cost() < coreRoomCapacity) {
				solved = true
				break
			}
			else {
				numCreeps += 1
			}
		}


		let outObj = {num: Math.min(maxCreeps, numCreeps), body: requiredParts}
		return outObj
	}

	run() {
		this.spawnCreeps()
		this.runCreeps()
	}
	runCreeps() {
		let risk = false
		let unsatisfied = false
		for (let creepName in this.creeps) {
			let creepObj = Game.creeps[creepName]
			if (!_.isUndefined(creepObj)) {
				creepObj.run()
				if (creepObj.ticksToLive < creepObj.body.length*CREEP_SPAWN_TIME) {
					risk = true
				}
			}
			else {
				unsatisfied = true
			}
		}
		if (unsatisfied) {
			this.satisfaction = 2
		}
		else if (risk) {
			this.satisfaction = 1
		}
		else {
			this.satisfaction = 0
		}
	}
	spawnCreeps() {
		for (let creepName in this.creeps) {
			let creepObj = this.creeps[creepName]
			if (!_.has(Game.creeps, creepName) && creepObj.status == 0) {
				let succeeded = Imperium.sectors[this.sectorName].addCreep({
					creepName:		creepName,
					creepBody:		this.creeps[creepName].body,
					memObject:		this.creeps[creepName].memObject,
					priority:		this.creeps[creepName].priority
				})
				if (succeeded) {
					this.creeps[creepName].status = 1
				}
			}
		}
	}


	init() {
		let sourcePosObj = RoomPosition.parse(this.taskInfo.sourcePos)
		let adj = _.filter(sourcePosObj.getAdjacent({serialize: true, checkTerrain: true}), s => s != this.taskInfo.standPos)

		this.initCreeps()
		this.taskInfo.validPositions = [this.taskInfo.standPos, ...adj]
		this.taskInfo.validPositions.length = this.taskInfo.creeps['MINERS']
	}
	initCreeps() {
		let miners = this.getCreeps(MINING.BODIES.MINER, {})
		let perTick = miners.num * _.filter(miners.body, s => s == WORK).length * HARVEST_POWER
		let haulers = this.getCreeps(MINING.BODIES.HAULER, {actualPerTick: perTick, pathLength: this.taskInfo.pathLength})

		this.taskInfo.creeps = {
			'MINERS':	miners.num,
			'HAULERS':	haulers.num
		}

		let minerPriorityBase = 5
		let minerPriorityGrowth = 0.5
		for (let i = 0; i < miners.num; i++) {
			let creepName = makeID()

			let stateStack = [[
				'MINE', {
					sourcePosStr:	this.taskInfo.sourcePos,
					standPosStr:	this.taskInfo.validPositions
				}
			]]
			let memObject = {
				taskID:		this.id,
				home:		this.name,
				stack:		stateStack
			}
			let outObj = {
				body: 		miners.body,
				priority:	minerPriorityBase + i*minerPriorityGrowth,
				memObject: 	memObject,
				status: 		0
			}
			this.creeps[creepName] = outObj
		}
		
		let haulerPriorityBase = 5.25
		let haulerPriorityGrowth = 0.25
		for (let i = 0; i < haulers.num; i++) {
			let creepName = makeID()
			let stateStack = [[
				'LOAD', {
					loadArray:		this.taskInfo.validPositions,
					resource:		RESOURCE_ENERGY,
					canPop: 		false,
					unloadArray:	[this.taskInfo.originPos]
				}
			]]
			let memObject = {
				taskID:		this.id,
				home:		this.name,
				stack:		stateStack
			}
			let outObj = {
				body: 		haulers.body,
				priority:	haulerPriorityBase + i*haulerPriorityGrowth,
				memObject: 	memObject,
				status: 	0
			}
			this.creeps[creepName] = outObj
		}
	}

	update() {
		this.creeps = {}
		this.init()
	}
}
MINING['BODIES'] = {
	'MINER': 'MINER',
	'HAULER': 'HAULER'
}
MINING['lookup'] = {
	[RESOURCE_ENERGY]:		HARVEST_POWER,

	[RESOURCE_HYDROGEN]:	HARVEST_MINERAL_POWER,
	[RESOURCE_OXYGEN]:		HARVEST_MINERAL_POWER,
	[RESOURCE_UTRIUM]:		HARVEST_MINERAL_POWER,
	[RESOURCE_LEMERGIUM]:	HARVEST_MINERAL_POWER,
	[RESOURCE_KEANIUM]:		HARVEST_MINERAL_POWER,
	[RESOURCE_ZYNTHIUM]:	HARVEST_MINERAL_POWER,
	[RESOURCE_CATALYST]:	HARVEST_MINERAL_POWER
}

if (_.isUndefined(global.TASKS)) {
	global.TASKS = {}
}
TASKS['MINING'] = MINING


/*
class MINING extends Task {

	constructor(scope) {
		let {sectorName, id, taskInfo, creeps={}, structures=[]} = scope
		super()

		this.sectorName = sectorName
		this.id = id

		this.taskInfo = taskInfo
		this.creeps = creeps
		this.structures = structures

		this.type = 'MINING'
	}

	static BODIES = {
		MINER: function(sourceAmt, sectorName) {
			let originRoomObj = Game.rooms[sectorName]
			let roomEnergyCapacity = originRoomObj.energyCapacityAvailable

			let desiredFreeTime = 20
			let desiredWorkParts = sourceAmt / HARVEST_POWER / (ENERGY_REGEN_TIME - desiredFreeTime)
			let carryParts = 1
			let movePartPerWorkPart = 0.5

			let bodyCounter = {}
			bodyCounter[CARRY] = carryParts
			bodyCounter[WORK] = 0
			bodyCounter[MOVE] = 1

			// Increment WORK parts, adding MOVE when needed
			for (let i = 0; i < desiredWorkParts; i += 1) {
				let toPush = {}
				toPush[WORK] = 1
				if ( (bodyCounter[WORK] + toPush[WORK])/bodyCounter[MOVE] < movePartPerWorkPart) {
					toPush[CARRY] = 1
				} 

				let toPushCost = _.sum(toPush, (num, part) => BODYPART_COST[part]*num)
				let bodyCost = _.sum(bodyCounter, (num, part) => BODYPART_COST[part]*num)
				if (bodyCost + toPushCost > roomEnergyCapacity) {
					break
				}

				for (let part in toPush) {
					let num = toPush[part]
					bodyCounter[part] += num
				}
			}

			// Turn counter object into body array
			let body = []
			for (let part in bodyCounter) {
				for (let num = 0; num < bodyCounter[part]; num += 1) {
					body.push(part)
				}
			}

			return {body: body}
		},
		HAULER: function(sourceAmt, pathLength, sectorName) {
			let originRoomObj = Game.rooms[sectorName]

			let roomEnergyCapacity = originRoomObj.energyCapacityAvailable

			let energyPerTick = sourceAmt / ENERGY_REGEN_TIME
			let desiredCarryParts = Math.ceil((pathLength * 2 * energyPerTick) / CARRY_CAPACITY)

			let movePartsPerCarryPart = 1
			
			let bodyCounter = {}
			bodyCounter[CARRY] = 0
			bodyCounter[MOVE] = 0

			// Increment CARRY parts, adding MOVE when needed
			for (let i = 0; i < desiredCarryParts; i += 1) {
				let toPush = {}
				toPush[CARRY] = 1
				toPush[MOVE] = 1

				let toPushCost = _.sum(toPush, (num, part) => BODYPART_COST[part]*num)
				let bodyCost = _.sum(bodyCounter, (num, part) => BODYPART_COST[part]*num)
				if (bodyCost + toPushCost > roomEnergyCapacity) {
					break
				}

				for (let part in toPush) {
					let num = toPush[part]
					bodyCounter[part] += num
				}
			}

			// Turn counter object into body array
			let body = []
			for (let part in bodyCounter) {
				for (let num = 0; num < bodyCounter[part]; num += 1) {
					body.push(part)
				}
			}

			let haulerCount = Math.ceil(desiredCarryParts / bodyCounter[CARRY])

			return {body: body, count: haulerCount}
		}
	}

	init() {
		this.initCreeps()
		this.initStructures()
	}
	run() {
		this.runCreeps()
		this.spawnCreeps()
		this.checkStructures()
	}

	initCreeps() {
		// Make miner
		let minerName = makeID()
		this.creeps[minerName] = {
			'body':		'MINER',
			'status': 	0
		}

		// // Make hauler(s)
		let {count, body} = MINING.BODIES['HAULER'](this.taskInfo.sourceAmt, this.taskInfo.pathLength, this.sectorName)
		for (let i = 0; i < count; i+=1) {
			let haulerName = makeID()
			this.creeps[haulerName] = {
				'body':		'HAULER',
				'status':	0
			}
		}
	}
	initStructures() {
		this.structures.push({
			'posStr':			this.taskInfo.standPos,
			'structureType':	STRUCTURE_CONTAINER,
			'status':			1
		})
	}
	spawnCreeps() {
		for (let creepName in this.creeps) {
			let creepObj = this.creeps[creepName]

			if (!_.has(Game.creeps, creepName) && creepObj.status == 0) {
				if (creepObj.body == 'MINER') {
					let stateStack = [[
						'MINE', {
							'sourcePosStr':		this.taskInfo.sourcePos,
							'standPosStr':		this.taskInfo.standPos
						}]
					]
					let memObject = {
						'taskID':	this.id,
						'home':		this.sectorName,
						'stack':	stateStack
					}

					let creepBody = MINING.BODIES[creepObj.body](this.taskInfo.sourceAmt, this.sectorName).body

					let succeeded = Imperium.sectors[this.sectorName].addCreep({
						'creepName': 	creepName,
						'creepBody':	creepBody,
						'memObject':	memObject
					})
					if (succeeded) {
						this.creeps[creepName].status = 1
					}
				}
				else if (creepObj.body == 'HAULER') {
					let stateStack = [[
						'LOAD', {
							'posStr':		this.taskInfo.standPos,
							'resource':		RESOURCE_ENERGY,
							'canPop': 		false,
							'unloadStrPos':	this.taskInfo.originPos
						}
					]]
					let memObject = {
						'taskID':	this.id,
						'home':		this.sectorName,
						'stack':	stateStack
					}

					let creepBody = MINING.BODIES[creepObj.body](this.taskInfo.sourceAmt, this.taskInfo.pathLength, this.sectorName).body

					let succeeded = Imperium.sectors[this.sectorName].addCreep({
						'creepName': 	creepName,
						'creepBody':	creepBody,
						'memObject':	memObject
					})
					if (succeeded) {
						this.creeps[creepName].status = 1
					}
				}
			}
		}
	}
	checkStructures() {
		for (let idx in this.structures) {
			let structureObj = this.structures[idx]
			let posObj = RoomPosition.parse(structureObj.posStr)

			// Structure shouldn't exist
			if (structureObj.status == 1) {
				let conSiteStatus = Game.rooms[this.room].createConstructionSite(posObj, structureObj.structureType)
				let allowedReturns = [0, -7]
				if (allowedReturns.includes(conSiteStatus)) {
					this.structures[idx].status = 2
				}
			}
			// Structure should exists
			else if (structureObj.status == 0) {
				let structureAtPos = _.find(Game.rooms[this.room].lookForAt(LOOK_STRUCTURES, posObj), s => s.structureType == structureObj.structureType)
				if (_.isUndefined(structureAtPos)) {
					this.structures[idx].status = 1
				}
			}
			// Structure should be building, check status
			else if (structureObj.status == 2) {
				let posObj = RoomPosition.parse(structureObj.posStr)
				let structureAtPos = _.find(Game.rooms[this.room].lookForAt(LOOK_STRUCTURES, posObj), s => s.structureType == structureObj.structureType)
				if (!_.isUndefined(structureAtPos)) {
					this.structures[idx].status = 0
				}
				else {
					let conSiteAtPos = _.find(Game.rooms[this.room].lookForAt(LOOK_CONSTRUCTION_SITES, posObj), s => s.structureType == structureObj.structureType)
					if (_.isUndefined(conSiteAtPos)) {
						this.structures[idx].status = 1
					}
				}
			}
		}
	}
	runCreeps() {
		for (let creepName in this.creeps) {
			if (!Game.creeps[creepName]) {
				continue
			}

			let creepObj = Game.creeps[creepName]
			if (creepObj.spawning) {
				this.creeps[creepName].status = 2
				continue
			}

			this.creeps[creepName].status = 0
			creepObj.run()
		}
	}
}
*/