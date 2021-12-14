Creep.prototype.run = function() {
	if (this.spawning) {
		return
	}
	
	this.taskInfo = Game.rooms[this.memory.home].tasks[this.memory.taskID].taskInfo
	this.invokeState()
}

Creep.prototype.STATE_HARVEST = function(scope) {
	let {posStr, canPop=true, targetRoomName = this.memory.homeRoom} = scope
	let homeRoom = Game.rooms[this.memory.homeRoom]

	let posObj = RoomPosition.parse(posStr)
	let targetRoom = Game.rooms[targetRoomName]

	// If we're full ..
	if (this.store.getFreeCapacity() == 0) {

		this.say('!')
		// Check to see if there's an empty spawn or extension
		if (targetRoom.energyAvailable < targetRoom.energyCapacityAvailable) {
			let allowedStructures = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION]
			let targetStructure = _.find(targetRoom.find(FIND_MY_STRUCTURES), s => allowedStructures.includes(s.structureType) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0)

			this.pushState('UNLOAD', {posStr: RoomPosition.serialize(targetStructure.pos), resource: RESOURCE_ENERGY})
		}
		
		// Check to see if we can build
		let constructionSites = targetRoom.find(FIND_CONSTRUCTION_SITES)
		if (constructionSites.length > 0) {
			this.pushState('BUILD', {posStr: RoomPosition.serialize(constructionSites[0].pos)})
		} 

		// Otherwise, toss energy in controller
		this.pushState('UPGRADE', {targetRoomName: targetRoomName})
	}

	// If we're not full ..
	else {
		// Check if we're in range of source
		if (this.pos.getRangeTo(posObj) > 1) {
			this.pushState('MOVE', {posStr: posStr, range: 1})
		}

		// Otherwise, mine source
		let sourceObj = posObj.lookFor(LOOK_SOURCES)[0]
		let harvestAction = this.harvest(sourceObj)
	}
}

Creep.prototype.STATE_MOVE = function(scope) {
	let {posStr, range=1, ignoreCreeps=false} = scope
	let posObj = RoomPosition.parse(posStr)

	if (this.room.name != posObj.roomName) {
		// cry
	}
	
	if (this.pos.inRangeTo(posObj, range)) {
		this.popState()
	}
	else {
		this.moveTo(posObj, {range: range, ignoreCreeps: ignoreCreeps, maxRooms: 1})
	}
}

Creep.prototype.STATE_UNLOAD = function(scope) {
	let {posStr, resource} = scope
	let posObj = RoomPosition.parse(posStr)

	// If we're not in range ..
	if (!this.pos.inRangeTo(posObj, 1)) {
		this.pushState('MOVE', {posStr: posStr})
	}

	// Otherwise, if we're empty ..
	if (this.store.getUsedCapacity == 0) {
		this.popState()
	}

	// Otherwise,
	else {
		// Edge case? If a creep deposits before this, it has nowhere to go. Reserve space?
		let targetObj = _.find(posObj.lookFor(LOOK_STRUCTURES), s => s.store && s.store.getFreeCapacity(resource) > 0)
		if (!targetObj) {
			this.popState()
		}

		let transaction = this.transfer(targetObj, resource)
		let popReturns = [-8, 0]
		if (popReturns.includes(transaction)) {
			this.popState()
		}
	}
}
Creep.prototype.STATE_UPGRADE = function(scope) {
	let {targetRoomName, canPop=true} = scope

	let posObj = Game.rooms[targetRoomName].controller
	let posStr = RoomPosition.serialize(posObj.pos)

	// If we're empty ..
	if (this.store[RESOURCE_ENERGY] == 0) {
		// If we're not a dedicated upgrader ..
		if (canPop) {
			this.popState()
		}
		// Otherwise, fill up
		else {
			//
		}
	}

	// Otherwise, check if we're in range
	if (!this.pos.inRangeTo(posObj, 3)) {
		this.pushState('MOVE', {posStr: posStr, range: 3})
	}

	// Otherwise, upgrade
	this.upgradeController(posObj)
}
Creep.prototype.STATE_BUILD = function(scope) {
	let {posStr, canPop=true} = scope
	let conSite = RoomPosition.parse(posStr).lookFor(LOOK_CONSTRUCTION_SITES)

	// Did we find a construction site?
	if (!conSite) {
		if (canPop) {
			this.popState()
		}

		// look for new construction site
	}

	// Are we empty?
	if (this.store[RESOURCE_ENERGY] == 0) {
		if (canPop) {
			this.popState()
		}

		// if we're here, we're a dedicated builder. find energy
	}

	// Otherwise, do build checks
	if (!this.pos.inRangeTo(RoomPosition.parse(posStr), 3)) {
		this.pushState('MOVE', {posStr: posStr, range: 3})
	}

	let buildAction = this.build(conSite)
}