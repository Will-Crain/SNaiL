Creep.prototype.run = function() {
	if (this.spawning) {
		return
	}
	
	this.task = Imperium.sectors[this.memory.home].tasks[this.memory.taskID]
	this.invokeState()
}

//#region STATES
Creep.prototype.STATE_HARVEST = function(scope) {
	let {posStr, canPop=true, targetRoomName = this.memory.homeRoom, status=0} = scope
	let homeRoom = Game.rooms[this.memory.homeRoom]

	let posObj = RoomPosition.parse(posStr)
	let targetRoom = Game.rooms[targetRoomName]

	let nearSource = this.room.name == targetRoomName && this.pos.inRangeTo(posObj, 1)

	let getNextAction = function() {
		// Check to see if there's an empty spawn or extension
		if (targetRoom.energyAvailable < targetRoom.energyCapacityAvailable) {
			let allowedStructures = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION]
			let targetStructure = _.find(targetRoom.find(FIND_MY_STRUCTURES), s => allowedStructures.includes(s.structureType) && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0)

			this.pushState('WAIT', {until: Game.time + 1})
			this.pushState('UNLOAD', {posStr: RoomPosition.serialize(targetStructure.pos), resource: RESOURCE_ENERGY})
			return
		}
		
		// Check to see if we can build
		let constructionSites = targetRoom.find(FIND_CONSTRUCTION_SITES)
		if (constructionSites.length > 0) {
			this.pushState('WAIT', {until: Game.time + 1})
			this.pushState('BUILD', {posStr: RoomPosition.serialize(constructionSites[0].pos)})
			return
		} 

		// Otherwise, toss energy in controller
		this.pushState('WAIT', {until: Game.time + 1})
		this.pushState('UPGRADE', {targetRoomName: targetRoomName})
		return
	}

	// If we're not close to the source ..
	if (!nearSource) {
		// and we're empty ..
		if (this.store.getUsedCapacity() == 0) {
			this.pushState('MOVE', {posStr: posStr, range: 1})
		}

		// and we're not empty ..
		else {
			getNextAction.call(this)
		}
	}

	// If we're close to the source ..
	else {
		// and we're full ..
		if (this.store.getUsedCapacity() == this.store.getCapacity()) {
			getNextAction.call(this)
		}
		
		// and we're not full ..
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
		return
	}

	// Otherwise, upgrade
	this.upgradeController(posObj)
}
Creep.prototype.STATE_BUILD = function(scope) {
	let {posStr, canPop=true} = scope
	let conSite = RoomPosition.parse(posStr).lookFor(LOOK_CONSTRUCTION_SITES)

	// Did we find a construction site?
	if (!conSite || conSite.length == 0) {
		if (canPop) {
			this.popState()
		}

		// if we're here, we're a dedicated builder. look for new construction site
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

	let buildAction = this.build(conSite[0])
}

Creep.prototype.STATE_WAIT = function(scope) {
	let {until} = scope

	if (Game.time >= until) {
		this.popState()
	}
}
//#endregion

Creep.bodyCost = function(body) {
	return _.sum(body, s => BODYPART_COST[s])
}