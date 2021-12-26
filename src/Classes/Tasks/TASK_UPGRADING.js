class UPGRADING extends TASKS.Task {
	/* UPGRADING taskInfo expects
	{
		str controllerID,		Controller ID
		str controllerPos,		Serialized controller position
		int desiredThroughput,	How much energy we want to spend per tick (see: CONTROLLER_MAX_UPGRADE_PER_TICK)
		str containerPos,		Serialized controller position
		str linkPos,			Serialized link position
		bool static				Whether or not ugpraders should be static. For now, we assume true
	}
	*/
	constructor (scope={}) {
		let {
			sectorName, id, taskInfo={},
			creeps={}, structures={}, 
			priorityOffset=0
		} = scope
		super()

		this.sectorName = sectorName
		this.id = id
		this.taskInfo = taskInfo
		
		this.creeps = creeps
		this.structures = structures

		this.priorityOffset = priorityOffset

		this.satisfaction = 0
		this.type = 'UPGRADING'
	}

	init() {
		this.taskInfo.validPositions = RoomPosition.parse(this.taskInfo.controllerPos).getStandPositions({range: 3, serialized: true})
		this.initCreeps()
	}
	initCreeps() {
		let upgraders = this.getCreeps(UPGRADING.BODIES.UPGRADER, {})

		this.taskInfo.creeps = {
			'UPGRADERS':	upgraders.num
		}

		let upgraderPriorityBase = 5
		let upgraderPriorityGrowth = 0.5
		for (let i = 0; i < upgraders.num; i++) {
			let creepName = makeID()

			let stateStack = [[
				'UPGRADE', {
					controllerPos:	this.taskInfo.controllerPos,
					controllerID:	this.taskInfo.controllerID,
					loadFrom:		[this.taskInfo.linkPos, this.taskInfo.containerPos],
					canPop: 		false
				}
			]]
			let memObject = {
				taskID:		this.id,
				home:		this.name,
				stack:		stateStack
			}
			let outObj = {
				body:		upgraders.body,
				priority:	upgraderPriorityBase + i*upgraderPriorityGrowth,
				memObject:	memObject,
				status:		0
			}

			this.creeps[creepName] = outObj
		}
	}

	run() {
		this.spawnCreeps()
		this.runCreeps()
	}

	getCreeps(type, scope={}) {
		let coreRoom = Game.rooms[this.sectorName]
		let coreRoomCapacity = coreRoom.energyCapacityAvailable

		let requiredParts = new CreepBody()
		let numCreeps = 1

		let [perTarget, targetPart, maxTargetPart, maxCreeps] = [0, '', 0, 0]
		switch(type) {
			case UPGRADING.BODIES.UPGRADER:
				let {throughput=15} = scope
				targetPart = WORK
				maxTargetPart = Math.ceil(throughput / UPGRADE_CONTROLLER_POWER)

				perTarget = {
					[CARRY]: 	2/8,
					[MOVE]:		4/8
				}

				let roomPos = RoomPosition.parse(this.taskInfo.controllerPos)
				maxCreeps = roomPos.getStandPositions({range: 3, serialized: true}).length
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
		console.log(outObj.num, maxCreeps, numCreeps)
		return outObj
	}

}
UPGRADING['BODIES'] = {
	'UPGRADER':	'UPGRADER',
	'HAULER':	'HAULER'
}

TASKS['UPGRADING'] = UPGRADING