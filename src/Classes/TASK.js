/* Tasks
	Tasks chill as a child of a Sector or the Imperium and they get run every tick.
	Some tasks request sectors to spawn creeps, others observe rooms,
	and others make the labs run and the power flow. They're quite versatile.

	Specific tasks (which are extensions on the base Task class) are
	named by a -ing verb in all caps. Some examples may include
	MINING, UPGRADING, OBSERVING, etc.
*/
class Task {
	run() {
		this.jobs.forEach(function(job, jobIdx) {
			job.forEach(function(creep, creepIdx) {
				creep.run(this.taskInfo)
			})
		})
	}
}
Task.basePriorities = {
	'MINING':		2,
	'UPGRADING':	3
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
			let creepName = makeID()
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

GATHERING['BODIES'] = {
	GATHERER: {
		1:	[MOVE, CARRY, WORK],
		2:	[WORK, WORK, CARRY, CARRY, MOVE, MOVE],
		3:	[WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
	}
}

TASKS['Task'] = Task

