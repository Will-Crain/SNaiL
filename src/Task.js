class Task {
	run() {
		this.jobs.forEach(function(job, jobIdx) {
			job.forEach(function(creep, creepIdx) {
				creep.run(this.taskInfo)
			})
		})
	}

	static makeID() {
		return `${Math.random().toString(16).slice(2, 10)}`
	}

	serialize() {

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
		super()
		let {room, id, taskInfo, creeps} = scope

		this.room = room
		this.id = id

		this.taskInfo = taskInfo
		this.creeps = creeps

		this.type = 'GATHERING'
	}

	static BODIES = {
		GATHERER: {
			1:	[MOVE, MOVE, CARRY, CARRY, WORK],
			2:	[WORK, WORK, CARRY, CARRY, MOVE, MOVE],
			3:	[WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
		}
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
		
		for (i = 0; i < adjacentPositions*2; i += 1) {
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
						'targetRoomName':	this.room
					}]
				]
				let memObject = {
					'taskID': 		this.id,
					'home':			this.room,
					'stack':		stateStack
				}

				let bodyStr = creepObj.body
				let creepBody = []

				for (let i = 8; i > 0; i--) {
					if (!_.has(GATHERING.BODIES[bodyStr], i)) {
						continue
					}
					if (Creep.bodyCost(GATHERING.BODIES[bodyStr][i]) <= Game.rooms[this.room].energyCapacityAvailable) {
						creepBody = GATHERING.BODIES[bodyStr][i]
						break
					}
				}

				let succeeded = Game.rooms[this.room].spawnCreep(creepName, creepBody, memObject)
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

	constructor(scope) {
		super()
		let {homeName, id, taskInfo, creeps, structures} = scope

		this.room = homeName
		this.taskInfo = taskInfo
		this.id = id
		this.creeps = creeps
		this.structures = structures

		// this.type = 'MINING'
	}

	static BODIES = {
		MINER: function(sourceAmt, originRoom) {
			
			let originRoomObj = Game.rooms[originRoom]
			let roomEnergyCapacity = originRoomObj.energyCapacityAvailable

			let desiredFreeTime = 20
			let desiredWorkParts = sourceAmt / HARVEST_POWER / (ENERGY_REGEN_TIME - desiredFreeTime)
			let carryParts = 1
			let movePartPerWorkPart = 0.5

			let bodyCounter = {}
			bodyCounter[CARRY] = carryParts
			bodyCounter[WORK] = 0
			bodyCounter[MOVE] = 0

			// Increment WORK parts, adding MOVE when needed
			for (let i = 0; i < desiredWorkParts; i += 1) {
				let toPush = {WORK: 1}
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
		HAULER: function(sourceAmt, pathLength, hasRoad=false) {
			let energyPerTick = sourceAmt / ENERGY_REGEN_TIME
			let desiredCarryParts = Math.ceil((pathLength * 2 * energyPerTick) / CARRY_CAPACITY)

			let movePartsPerCarryPart = 1
			
			let bodyCounter = {}
			bodyCounter[CARRY] = 0
			bodyCounter[MOVE] = 0

			// Increment CARRY parts, adding MOVE when needed
			for (let i = 0; i < desiredCarryParts; i += 1) {
				toPush = {CARRY: 1}
				if ((bodyCounter[CARRY] + toPush[CARRY])/bodyCounter[MOVE] < movePartsPerCarryPart) {
					toPush[MOVE] = 1
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

			let haulerCount = Math.ceil(desiredCarryParts / bodyCounter[CARRY])

			return {body: body, count: haulerCount}
		}
	}

	init() {
		this.initCreeps()
	}
	run() {
		this.runCreeps()
		this.spawnCreeps()
		this.checkStructures()
	}

	initCreeps() {
		// Make miner
		let minerName = Task.makeID()
		this.creeps[minerName] = {
			'body':		'MINER',
			'status': 	0
		}

		// Make hauler(s)
		let {count, body} = MINING.BODIES['HAULER']()
		for (let i = 0; i < count; i+=1) {
			let haulerName = Task.makeID()
			this.creeps[haulerName] = {
				'body':		'HAULER',
				'status':	0
			}
		}
		this.creeps[haulerName]
	}
	spawnCreeps() {
		for (let creepName in this.creeps) {
			let creepObj = this.creeps[creepName]

			if (!_.has(Game.creeps, creepName) && creepObj.status == 0) {
				if (creepObj.body == 'MINER') {
					let stateStack = [[
						'MINE', {
							'sourcePosStr':	this.taskInfo.sourcePos,
							'standPosStr':	this.taskInfo.standPos
						}]
					]
					let memObject = {
						'taskID':	this.id,
						'home':		this.room,
						'stack':	stateStack
					}

					let creepBody = MINING.BODIES[creepObj.body]().body

					let succeeded = Game.rooms[this.room].spawnCreep(creepName, creepBOdy, memObject)
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
						'home':		this.room,
						'stack':	stateStack
					}

					let creepBody = MINING.BODIES[creepObj.body]().body

					let succeeded = Game.rooms[this.room].spawnCreep(creepName, creepBody, memObject)
					if (succeeded) {
						this.creeps[creepName].status = 1
					}
				}
			}
		}
	}
}

module.exports = {
	Task: Task,
	GATHERING:	GATHERING
}