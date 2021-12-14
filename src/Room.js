Room.prototype.run = function() {
	if (!this.memory.setup) {
		this.setup()
		return
	}

	this.loadSpawnQueue()
	this.loadTasks()

	this.checkLevelUp()
	this.runSpawns()
	this.runTasks()

	this.saveSpawnQueue()
	this.saveTasks()
}

//#region Spawning code
Room.prototype.saveSpawnQueue = function() {
	this.memory.spawnQueue = this.spawnQueue
}
Room.prototype.loadSpawnQueue = function() {
	this.spawnQueue = this.memory.spawnQueue
}
Room.prototype.spawnCreep = function(creepName, creepBody, memObject) {
	if (_.has(this.spawnQueue, creepName)) {
		return false
	}

	let creepObj = {
		'body': creepBody,
		'memory': memObject
	}

	this.spawnQueue[creepName] = creepObj

	return true
}
Room.prototype.runSpawns = function() {
	if (this.spawnQueue.length == 0) {
		return
	}

	let availableSpawns = _.filter(this.find(FIND_MY_STRUCTURES), s => s.structureType == STRUCTURE_SPAWN && !s.spawning)
	let spawnQueueKeys = Object.keys(this.spawnQueue)

	for (let spawnIdx in availableSpawns) {
		let spawner = availableSpawns[spawnIdx]

		if (spawnQueueKeys.length <= spawnIdx) {
			return
		}

		let targetCreep = this.spawnQueue[spawnQueueKeys[spawnIdx]]
		let spawnCheck = spawner.createCreep(targetCreep.body, spawnQueueKeys[spawnIdx], targetCreep.memory)
		let illegalErrors = [-1, -3, -10, -14]

		if (typeof spawnCheck == 'string') {
			delete this.spawnQueue[spawnQueueKeys[spawnIdx]]
		}
		else if (illegalErrors.includes(spawnCheck)) {
			delete this.spawnQueue[spawnQueueKeys[spawnIdx]]
		}
	}
}
//#endregion

//#region Setup
Room.prototype.setup = function() {
	this.validateMemory()
	this.setupSources()
}
Room.prototype.validateMemory = function() {
    let objects = {
		spawnQueue: {}, 
		tasks: {}, 
		setup: true,
		buildQueue: [], 
		level: 1
	}
	for (let key in objects) {
		let val = objects[key]

		if (!_.has(this.memory, key)) {
			this.memory[key] = val
		}
	}
}
Room.prototype.setupSources = function() {
	let sources = this.find(FIND_SOURCES)

	for (let idx in sources) {
		let source = sources[idx]

		let spawnLocation = _.find(this.find(FIND_MY_STRUCTURES), s => s.structureType == STRUCTURE_SPAWN)
		console.log(spawnLocation.pos, source.pos)
		let path = this.findPath(spawnLocation.pos, source.pos, {ignoreCreeps: true, ignoreRoads: true})

		let taskInfo = {
			'sourceID':		source.id,
			'sourcePos':	RoomPosition.serialize(source.pos),
			'sourceAmt':	source.energyCapacity,
			'path':			Room.serializePath(path),
			'pathLength':	path.length,
			'originPos':	RoomPosition.serialize(spawnLocation.pos)
		}

		this.addTask(new Task.GATHERING(this.name, Task.Task.makeID(), taskInfo))
	}
}
//#endregion

//#region Tasks
Room.prototype.saveTasks = function() {
	for (let taskID in this.tasks) {
		let taskObj = this.tasks[taskID]
		this.memory.tasks[taskID] = taskObj
	}
}
Room.prototype.loadTasks = function() {
	this.tasks = {}
	for (let taskID in this.memory.tasks) {
		let taskMem = this.memory.tasks[taskID]
		this.tasks[taskID] = new Task[taskMem.type](this.name, taskID, taskMem.taskInfo, taskMem.creeps)
	}
}
Room.prototype.addTask = function(taskObj) {
	// Add a check if a task with this id already exists
	this.memory.tasks[taskObj.id] = taskObj
}
Room.prototype.runTasks = function() {
	for (let taskID in this.tasks) {
		let taskObj = this.tasks[taskID]

		// Check to see if we've been initialized
		if (!taskObj.taskInfo.init) {
			taskObj.init()
			taskObj.taskInfo['init'] = true
		}

		taskObj.run()
	}
}
//#endregion

// Misc
Room.prototype.checkLevelUp = function() {
	if (this.memory.level != this.controller.level) {
		console.log(`${this.name} levelled up!`)
		this.memory.level = this.controller.level
		
		for (let taskName in this.tasks) {
			this.tasks[taskName].update()
		}
	}
}