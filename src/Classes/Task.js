class Task {
	run() {
		this.jobs.forEach(function(job, jobIdx) {
			job.forEach(function(creep, creepIdx) {
				creep.run(this.taskInfo)
			})
		})
	}

	static makeID() {
		return `${Math.random().toString(36).slice(2, 11)}`
	}

	serialize() {

	}
}

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
	constructor (scope) {
		let {sectorName, id, taskInfo, creeps={}, structures={}} = scope
		super()

		this.sectorName = sectorName
		this.id = id

		this.taskInfo = taskInfo
		this.creeps = creeps

		this.type = 'MINING'
	}
	getCreeps(type, scope) {
		// let sectorFlags = Imperium.sectors[this.sectorName].flags
		let coreRoom = Game.rooms[this.sectorName]
		let coreRoomCapacity = coreRoom.energyCapacityAvailable

		let requiredParts = new CreepBody()
		let numCreeps = 0

		let perTarget, targetPart, maxTargetPart, maxCreeps

		switch (type) {
			case MINING.BODIES.MINER:
				let {resourceAmt=3000, timeToMine=300, resource=RESOURCE_ENERGY} = scope

				targetPart = WORK
				maxTargetPart = resourceAmt / MINING.lookup[resource] / timeToMine
				
				let perTarget = {
					[CARRY]:	0,
					[MOVE]:		1/4
				}

				let maxCreeps = RoomPosition.parse(this.sourcePos).getAdjacent({checkTerrain: true, serialized: true}).length
			case MINING.BODIES.HAULER:
				let {actualPerSecond, pathLength} = scope

				targetPart = CARRY
				maxTargetPart = ((2 * pathLength) * actualPerSecond ) / CARRY_CAPACITY

				perTarget = {
					[MOVE]:		1
				}

				let maxCreeps = 10


			requiredParts.set(targetPart, maxTargetPart)
			for (let part in perTarget) {
				requiredParts.set(part, Math.ceil(perTarget[part]*maxTargetPart))
			}

			let solved = false
			while (!solved) {

				if (requiredParts.cost() > coreRoomCapacity || requiredParts.invalid) {
					numCreeps += 1
				}
				let newParts = {
					'target':	Math.ceil(maxTargetPart/numCreeps)
				}
				for (let part in perTarget) {
					newParts[part] = Math.ceil(maxTargetPart*perTarget[part]/numCreeps)
				}
			
				requiredParts = new CreepBody().set(WORK, newWork).set(MOVE, newMove).set(CARRY, newCarry)

				if (!requiredParts.invalid) {
					solved = true
				}
			}

			let outObj = {num: Math.min(maxCreeps, numCreeps), body: requiredParts}
			return outObj
		}
	}

	init() {
		//
	}
}

class GATHERING extends Task {
	/* GATHERING taskInfo expects
	{
		str sourceID,		Source ID
		str sourcePos,		Serialized source position
		int sourceAmt,		Source amount
		str path,			Serialized path
		int pathLength,		Path length,
		str originPos		Serialized origin position (storage, spawn, etc)
	}
	*/
	constructor(scope) {
		let {sectorName, id, taskInfo, creeps={}} = scope
		super()

		this.sectorName = sectorName
		this.id = id

		this.taskInfo = taskInfo
		this.creeps = creeps

		this.type = 'GATHERING'
	}

	init() {
		this.initCreeps()
	}
	run() {
		this.runCreeps()
		this.spawnCreeps()
	}
	initCreeps() {
		let roomPos = RoomPosition.parse(this.taskInfo.sourcePos)

		// Find how many gatherers we can fit around the source
		let adjacentPositions = roomPos.getAdjacent().length
		
		for (i = 0; i < adjacentPositions; i += 1) {
			let creepName = Task.makeID()
			let creepBody = 'GATHERER'

			this.creeps[creepName] = {
				'body':		creepBody,
				'status':	0
			}
		}
	}
	spawnCreeps() {
		for (let creepName in this.creeps) {
			let creepObj = this.creeps[creepName]

			if (!_.has(Game.creeps, creepName) && creepObj.status == 0) {
				let stateStack = [[
					'HARVEST', {
						'posStr':	this.taskInfo.sourcePos,
						'canPop':	false,
						'targetRoomName':	this.sectorName
					}]
				]
				let memObject = {
					'taskID': 		this.id,
					'home':			this.sectorName,
					'stack':		stateStack
				}

				let bodyStr = creepObj.body
				let creepBody = []

				for (let i = 8; i > 0; i--) {
					if (!_.has(GATHERING.BODIES[bodyStr], i)) {
						continue
					}
					if (Creep.bodyCost(GATHERING.BODIES[bodyStr][i]) <= Game.rooms[this.sectorName].energyCapacityAvailable) {
						creepBody = GATHERING.BODIES[bodyStr][i]
						break
					}
				}

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
	update() {
		//
	}
}

// class MINING extends Task {
// 	/* MINING taskInfo expects
// 	{
// 		str sourceID,		Source ID
// 		str sourcePos,		Serialized source position
// 		int sourceAmt,		Source amount
// 		str standPos,		Serialized container position
// 		str path,			Serialized path
// 		int pathLength,		Path length,
// 		str originPos		Serialized origin position (storage, spawn, etc)
// 	}
// 	*/

// 	constructor(scope) {
// 		let {sectorName, id, taskInfo, creeps={}, structures=[]} = scope
// 		super()

// 		this.sectorName = sectorName
// 		this.id = id

// 		this.taskInfo = taskInfo
// 		this.creeps = creeps
// 		this.structures = structures

// 		this.type = 'MINING'
// 	}

// 	static BODIES = {
// 		MINER: function(sourceAmt, sectorName) {
// 			let originRoomObj = Game.rooms[sectorName]
// 			let roomEnergyCapacity = originRoomObj.energyCapacityAvailable

// 			let desiredFreeTime = 20
// 			let desiredWorkParts = sourceAmt / HARVEST_POWER / (ENERGY_REGEN_TIME - desiredFreeTime)
// 			let carryParts = 1
// 			let movePartPerWorkPart = 0.5

// 			let bodyCounter = {}
// 			bodyCounter[CARRY] = carryParts
// 			bodyCounter[WORK] = 0
// 			bodyCounter[MOVE] = 1

// 			// Increment WORK parts, adding MOVE when needed
// 			for (let i = 0; i < desiredWorkParts; i += 1) {
// 				let toPush = {}
// 				toPush[WORK] = 1
// 				if ( (bodyCounter[WORK] + toPush[WORK])/bodyCounter[MOVE] < movePartPerWorkPart) {
// 					toPush[CARRY] = 1
// 				} 

// 				let toPushCost = _.sum(toPush, (num, part) => BODYPART_COST[part]*num)
// 				let bodyCost = _.sum(bodyCounter, (num, part) => BODYPART_COST[part]*num)
// 				if (bodyCost + toPushCost > roomEnergyCapacity) {
// 					break
// 				}

// 				for (let part in toPush) {
// 					let num = toPush[part]
// 					bodyCounter[part] += num
// 				}
// 			}

// 			// Turn counter object into body array
// 			let body = []
// 			for (let part in bodyCounter) {
// 				for (let num = 0; num < bodyCounter[part]; num += 1) {
// 					body.push(part)
// 				}
// 			}

// 			return {body: body}
// 		},
// 		HAULER: function(sourceAmt, pathLength, sectorName) {
// 			let originRoomObj = Game.rooms[sectorName]

// 			let roomEnergyCapacity = originRoomObj.energyCapacityAvailable

// 			let energyPerTick = sourceAmt / ENERGY_REGEN_TIME
// 			let desiredCarryParts = Math.ceil((pathLength * 2 * energyPerTick) / CARRY_CAPACITY)

// 			let movePartsPerCarryPart = 1
			
// 			let bodyCounter = {}
// 			bodyCounter[CARRY] = 0
// 			bodyCounter[MOVE] = 0

// 			// Increment CARRY parts, adding MOVE when needed
// 			for (let i = 0; i < desiredCarryParts; i += 1) {
// 				let toPush = {}
// 				toPush[CARRY] = 1
// 				toPush[MOVE] = 1

// 				let toPushCost = _.sum(toPush, (num, part) => BODYPART_COST[part]*num)
// 				let bodyCost = _.sum(bodyCounter, (num, part) => BODYPART_COST[part]*num)
// 				if (bodyCost + toPushCost > roomEnergyCapacity) {
// 					break
// 				}

// 				for (let part in toPush) {
// 					let num = toPush[part]
// 					bodyCounter[part] += num
// 				}
// 			}

// 			// Turn counter object into body array
// 			let body = []
// 			for (let part in bodyCounter) {
// 				for (let num = 0; num < bodyCounter[part]; num += 1) {
// 					body.push(part)
// 				}
// 			}

// 			let haulerCount = Math.ceil(desiredCarryParts / bodyCounter[CARRY])

// 			return {body: body, count: haulerCount}
// 		}
// 	}

// 	init() {
// 		this.initCreeps()
// 		this.initStructures()
// 	}
// 	run() {
// 		this.runCreeps()
// 		this.spawnCreeps()
// 		this.checkStructures()
// 	}

// 	initCreeps() {
// 		// Make miner
// 		let minerName = Task.makeID()
// 		this.creeps[minerName] = {
// 			'body':		'MINER',
// 			'status': 	0
// 		}

// 		// // Make hauler(s)
// 		let {count, body} = MINING.BODIES['HAULER'](this.taskInfo.sourceAmt, this.taskInfo.pathLength, this.sectorName)
// 		for (let i = 0; i < count; i+=1) {
// 			let haulerName = Task.makeID()
// 			this.creeps[haulerName] = {
// 				'body':		'HAULER',
// 				'status':	0
// 			}
// 		}
// 	}
// 	initStructures() {
// 		/* Structures follow the form
// 		{
// 			string posStr,
// 			string structureType,
// 			status
// 		}
// 		*/
// 		this.structures.push({
// 			'posStr':			this.taskInfo.standPos,
// 			'structureType':	STRUCTURE_CONTAINER,
// 			'status':			1
// 		})
// 	}
// 	spawnCreeps() {
// 		for (let creepName in this.creeps) {
// 			let creepObj = this.creeps[creepName]

// 			if (!_.has(Game.creeps, creepName) && creepObj.status == 0) {
// 				if (creepObj.body == 'MINER') {
// 					let stateStack = [[
// 						'MINE', {
// 							'sourcePosStr':		this.taskInfo.sourcePos,
// 							'standPosStr':		this.taskInfo.standPos
// 						}]
// 					]
// 					let memObject = {
// 						'taskID':	this.id,
// 						'home':		this.sectorName,
// 						'stack':	stateStack
// 					}

// 					let creepBody = MINING.BODIES[creepObj.body](this.taskInfo.sourceAmt, this.sectorName).body

// 					let succeeded = Imperium.sectors[this.sectorName].addCreep({
// 						'creepName': 	creepName,
// 						'creepBody':	creepBody,
// 						'memObject':	memObject
// 					})
// 					if (succeeded) {
// 						this.creeps[creepName].status = 1
// 					}
// 				}
// 				else if (creepObj.body == 'HAULER') {
// 					let stateStack = [[
// 						'LOAD', {
// 							'posStr':		this.taskInfo.standPos,
// 							'resource':		RESOURCE_ENERGY,
// 							'canPop': 		false,
// 							'unloadStrPos':	this.taskInfo.originPos
// 						}
// 					]]
// 					let memObject = {
// 						'taskID':	this.id,
// 						'home':		this.sectorName,
// 						'stack':	stateStack
// 					}

// 					let creepBody = MINING.BODIES[creepObj.body](this.taskInfo.sourceAmt, this.taskInfo.pathLength, this.sectorName).body

// 					let succeeded = Imperium.sectors[this.sectorName].addCreep({
// 						'creepName': 	creepName,
// 						'creepBody':	creepBody,
// 						'memObject':	memObject
// 					})
// 					if (succeeded) {
// 						this.creeps[creepName].status = 1
// 					}
// 				}
// 			}
// 		}
// 	}
// 	checkStructures() {
// 		for (let idx in this.structures) {
// 			let structureObj = this.structures[idx]
// 			let posObj = RoomPosition.parse(structureObj.posStr)

// 			// Structure shouldn't exist
// 			if (structureObj.status == 1) {
// 				let conSiteStatus = Game.rooms[this.room].createConstructionSite(posObj, structureObj.structureType)
// 				let allowedReturns = [0, -7]
// 				if (allowedReturns.includes(conSiteStatus)) {
// 					this.structures[idx].status = 2
// 				}
// 			}
// 			// Structure should exists
// 			else if (structureObj.status == 0) {
// 				let structureAtPos = _.find(Game.rooms[this.room].lookForAt(LOOK_STRUCTURES, posObj), s => s.structureType == structureObj.structureType)
// 				if (_.isUndefined(structureAtPos)) {
// 					this.structures[idx].status = 1
// 				}
// 			}
// 			// Structure should be building, check status
// 			else if (structureObj.status == 2) {
// 				let posObj = RoomPosition.parse(structureObj.posStr)
// 				let structureAtPos = _.find(Game.rooms[this.room].lookForAt(LOOK_STRUCTURES, posObj), s => s.structureType == structureObj.structureType)
// 				if (!_.isUndefined(structureAtPos)) {
// 					this.structures[idx].status = 0
// 				}
// 				else {
// 					let conSiteAtPos = _.find(Game.rooms[this.room].lookForAt(LOOK_CONSTRUCTION_SITES, posObj), s => s.structureType == structureObj.structureType)
// 					if (_.isUndefined(conSiteAtPos)) {
// 						this.structures[idx].status = 1
// 					}
// 				}
// 			}
// 		}
// 	}
// 	runCreeps() {
// 		for (let creepName in this.creeps) {
// 			if (!Game.creeps[creepName]) {
// 				continue
// 			}

// 			let creepObj = Game.creeps[creepName]
// 			if (creepObj.spawning) {
// 				this.creeps[creepName].status = 2
// 				continue
// 			}

// 			this.creeps[creepName].status = 0
// 			creepObj.run()
// 		}
// 	}
// }

MINING['BODIES'] = {
	'MINER': 0,
	'HAULER': 1
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
GATHERING['BODIES'] = {
	GATHERER: {
		1:	[MOVE, CARRY, WORK],
		2:	[WORK, WORK, CARRY, CARRY, MOVE, MOVE],
		3:	[WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
	}
}

module.exports = {
	Task: Task,
	GATHERING:	GATHERING,
	MINING: MINING
}