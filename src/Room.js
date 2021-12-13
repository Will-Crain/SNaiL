require('RoomJobs.js')

Room.prototype.run = function() {
	if (!this.memory.setup) {
		this.setup()
	}
}

// Spawning
Room.prototype.saveSpawnQueue = function() {
	this.memory.spawnQueue = this.spawnQueue
}
Room.prototype.loadSpawnQueue = function() {
	this.spawnQueue = this.memory.spawnQueue
}
Room.prototype.addCreep = function(bodyPlan, memory, spawnPriority = 2) {
	let creepName = `${this.name}-${this.memory.creepTicker}`
	if (!memory.home) {
		memory.home = this.name
	}
	memory.role = body
	body = this.planBody(body)

	let creepObj = {body, creepName, memory, spawnPriority}
	this.memory.creepTicker += 1
	this.spawnQueue.push(creepObj)

	return creepName
}
Room.prototype.runSpawns = function() {
	if (this.spawnQueue.length == 0) {
		return
	}

	let availableSpawns = _.filter(this.find(FIND_MY_STRUCTURES), s => s.structureType == STRUCTURE_SPAWN && !s.spawning)
	this.spawnQueue = _.sortBy(this.spawnQueue, s => s.spawnPriority).reverse()

	availableSpawns.forEach(function(spawner, spawnIdx) {
		if (spawnQueue.length >= spawnIdx) {
			return
		}

		let targetCreep = this.spawnQueue[spawnIdx]
		let spawnCheck = spawner.createCreep(targetCreep.body, targetCreep.name, targetCreep.memory)
		let illegalErrors = [-1, -3, -10, -14]

		if (typeof spawnCheck == 'string') {
			this.spawnQueue = _.drop(this.spawnQueue, 1)
		}
		else if (illegalErrors.includes(toSpawn)) {
			this.spawnQueue = _.drop(this.spawnQueue, 1)
		}
	})
}


// Misc
Room.prototype.getPID = function() {
	let toReturn = this.memory.PIDCount += 1
	this.memory.PIDCount += 1

	return toReturn
}
Room.prototype.validateMemory = function() {
    let objects = {
		spawnQueue: [], 
		sources: {}, 
		setup: false, 
		PIDCount: 0, 
		buildQueue: [], 
		level: 0, 
		creepTicker: 0
	}
	objects.forEach(function(val, idx) {
		if (!idx in this.memory) {
			this.memory[idx] = val
		}
	})
}


Room.prototype.operateMining = function() {

	// Check for source memory
	if (!this.memory.sources) {
		console.warn(`Setup room ${this.name} before operating`)
		return
	}

	// Check for vision
	if (!this.name in Game.rooms) {
		console.warn(`No vision of ${this.name}`)
		return
	}

	this.memory.sources.forEach(function(sourceMem, idx) {
		let sourcePosition = RoomPosition.deserialize(sourceMem.destination)

		// Check for source vision
		if (!sourcePosition.roomName in Game.rooms) {
			continue
		}


	})
}


Room.prototype.setup = function() {
	if (this.memory.setup) {
		return
	}

	let spawnLocation = self.find(FIND_STRUCTURES, s => s.structureType == STRUCTURE_SPAWN)

	this.memory.sources = []
	for (let source in this.find(FIND_SOURCES)) {
		self.setupSource(source)
	}

	this.memory.spawnQueue = []
	this.memory.taskQueue = []
}

Room.prototype.setupSource = function(source, path) {
	let spawnLocation = self.find(FIND_STRUCTURES, s => s.structureType == STRUCTURE_SPAWN)
	let path = this.findPath(spawnLocation.pos, source.pos, {ignoreCreeps: true, ignoreRoads: true})

	let energyPerTick = source.energyCapacity / ENERGY_REGEN_TIME
	let workParts = energyPerTick / 2

	let haulPerTick = path.length * 2 * energyPerTick

	let memoryObj = {
		'destination': 	RoomPosition.serialiaze(source.pos),
		'origin':		RoomPosition.serialiaze(spawnLocation.pos),
		'path':			Room.serializePath(path),
		'pathLen':		path.length,
		'workParts':	workParts,
		'haulParts':	haulPerTick,
		'creeps':		{
			'haulers':		[],
			'miners':		[],
			'gatherers':	[]
		}
	}

	this.memory.sources.push(memoryObj)
}