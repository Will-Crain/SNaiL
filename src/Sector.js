class Sector {
	constructor(scope) {
		let {coreRoomName, tasks={}, spawnQueue=[], spawnHash={}, eventFlags={}, level=0, setup=false} = scope

		this.coreRoomName = coreRoomName

		this.tasks = tasks

		this.spawnQueue = spawnQueue
		this.spawnHash = spawnHash

		this.eventFlags = eventFlags
		this.level = level

		this.setup = setup
	}

	// Setup
	setup() {
		//
	}

	run() {
		this.runTasks()
		this.runSpawns()

		this.checkEvents()
	}

	// Tasks
	addTask(task) {
		Imperium.sectors[this.coreRoomName].tasks[task.id] = task
	}
	runTasks() {
		for (let taskID in this.tasks) {
			let task = this.tasks[taskID]

			// Check to see if we've been initialized
			if (!task.taskInfo.init) {
				task.init()
				task.taskInfo['init'] = true
			}

			task.run()
		}
	}

	// Spawning
	addCreep(scope) {
		let {creepName, creepBody, memObject} = scope

		// Hash exists for quick lookups
		if (_.has(this.spawnHash, creepName)) {
			return false
		}

		let creepObj = {
			'body':		creepBody,
			'memory':	memObject
		}

		this.spawnQueue[creepName] = creepObj
		this.spawnHash[creepName] = 0

		return true
	}
	runSpawns() {

		// Make sure we have something in the queue
		if (this.spawnQueue.length == 0) {
			return
		}

		let availableSpawns = _.filter(Game.rooms[this.coreRoomName].find(FIND_MY_STRUCTURES), s => s.structureType == STRUCTURE_SPAWN && !s.spawning)
		for (let spawnIdx in availableSpawns) {
			let spawner = availableSpawns[spawnIdx]

			// Make sure we're not processing more creeps than we have in the queue
			if (spawnQueue.length <= spawnIdx) {
				return
			}

			let targetCreep = this.spawnQueue[spawnIdx]
			let spawnCheck = spawner.createCreep(targetCreep.body, targetCreep.name, targetCreep.memory)
			let illegalErrors = [-1, -3, -10, -14]

			if (illegalErrors.includes(spawnCheck)) {
				console.log(`${targetCreep.name} can't spawn in ${this.name}\t${spawnCheck}`)
			}

			// Remove from spawn hash and queue
			delete this.spawnQueue[spawnIdx]
			delete this.spawnHash[creepObj.name]
		}
	}

	// Events
	checkEvents() {
		for (let eventID in this.events) {
			if (this.events[eventID] != this.memory.events[eventID]) {
				print(`Event\t${eventID}\t${this.coreRoomName}`)
			}
		}
	}
}

module.exports = Sector