class MINING extends TASKS.Task {
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
		let {sectorName, id, priorityOffset=0, taskInfo={}, creeps={}, structures={}, unloadOrder=[]} = scope
		super()

		this.sectorName = sectorName
		this.id = id

		this.priorityOffset = priorityOffset

		this.taskInfo = taskInfo
		this.creeps = creeps

		this.structures = structures
		this.unloadOrder = unloadOrder

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
		// let adj = _.filter(sourcePosObj.getAdjacent({serialize: true, checkTerrain: true}), s => s != this.taskInfo.standPos)

		this.taskInfo.validPositions = [this.taskInfo.standPos, ...adj]

		this.initCreeps()
	}
	initCreeps() {
		let miners = this.getCreeps(MINING.BODIES.MINER, {})
		let perTick = miners.num * _.filter(miners.body, s => s == WORK).length * HARVEST_POWER
		let haulers = this.getCreeps(MINING.BODIES.HAULER, {actualPerTick: perTick, pathLength: this.taskInfo.pathLength})

		this.taskInfo.validPositions.length = miners.num

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
					standPositions:	this.taskInfo.validPositions
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
					unloadArray:	this.unloadOrder
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

TASKS['MINING'] = MINING