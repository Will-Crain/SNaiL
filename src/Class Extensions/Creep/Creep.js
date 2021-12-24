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
Creep.prototype.STATE_MINE = function(scope) {
	let {sourcePosStr, standPosStr} = scope
	let standPosObj = RoomPosition.parse(standPosStr)
	let sourcePosObj = RoomPosition.parse(sourcePosStr)

	// Are we in the right room?
	if (this.room.name != standPosObj.roomName) {
		// cry
	}
	// Are we near the stand position?
	else if (this.pos.getRangeTo(sourcePosObj) > 2) {
		this.pushState('MOVE', {posStr: sourcePosStr, range: 2})
	}
	// Can we stand on the stand position?
	else if (this.pos.getRangeTo(sourcePosObj) == 2) {
		let adjacentPositions = [standPosStr, ..._.filter(sourcePosObj.getAdjacent(), s => s != standPosStr)]
		for (let idx in adjacentPositions) {
			let adjPosObj = RoomPosition.parse(adjacentPositions[idx])
			if (!_.some(adjPosObj.look(), s => OBSTACLE_OBJECT_TYPES.includes(s.type))) {
				this.pushState('MOVE', {posStr: adjacentPositions[idx], range: 0})
			}
		}
	}
	else {
		let minePosObj = RoomPosition.parse(sourcePosStr)
		let mineObj = _.first(minePosObj.lookFor(LOOK_SOURCES))
		
		// If source is empty ..
		if (mineObj.energy == 0) {
			// Are we empty?
			if (this.store.getUsedCapacity() == 0) {
				this.pushState('WAIT', {until: Game.time + source.ticksToRegeneration})
				return
			}

			// Is there a caontainer?
			let container = _.find(standPosObj.lookFor(LOOK_STRUCTURES), s => s.structureType == STRUCTURE_CONTAINER)
			if (_.isUndefined(container)) {
				// Is there a construction site?
				let conSite = _.find(standPosObj.lookFor(LOOK_CONSTRUCTION_SITES), s => s.structureType == STRUCTURE_CONTAINER)
				if (_.isUndefined(conSite)) {
					// cry?
				}
				else {
					this.build(conSite)
				}
			}
			else {
				this.repair(container)
			}
		}
		// .. otherwise ..
		else {
			// Are we full?
			if (this.store.getFreeCapacity(RESOURCE_ENERGY) == 0) {
				// Check for a construction site at our feet
				let conSites = this.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 3)
				if (conSites.length > 0) {
					let buildAction = this.build(_.first(conSites))
					return
				}
			}
			let harvestAction = this.harvest(mineObj)
		}
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

Creep.prototype.STATE_LOAD = function(scope) {
	let {posStr, resource, canPop=true, unloadPosStr, checkAround} = scope
	let posObj = RoomPosition.parse(posStr)

	// If we're not in range ..
	if (!this.pos.inRangeTo(posObj, 1)) {
		this.pushState('MOVE', {posStr: posStr})
		return
	}


	// otherwise, find an object to take from
	let targetObj = _.find(posObj.lookFor(LOOK_STRUCTURES), s => s.store && s.store.getFreeCapacitY(resource) > 0)
	if (targetObj) {
		let transaction = this.withdraw(targetObj, resource)
		if (_.isUndefiend(unloadPosStr)) {
			this.popState()
		}
		else {
			this.pushState('UNLOAD', {posStr: unloadPosStr, resource: resource})
		}
	}
	else {
		// get positions to check
		let toCheck = [posStr]
		if (checkAround) {
			let adj = RoomPosition.parse(checkAround).getAdjacent()
			for (let i in adj) {
				if (!toCheck.includes(adj[i])) {
					toCheck.push(adj[i])
				}
			}
		}

		// Actually do the checking
		let targetPos, targetRes
		for (let idx in toCheck) {
			let checking = RoomPosition.parse(toCheck[idx])
			let floorRes = _.find(checking.lookFor(LOOK_RESOURCES), s => s.resourceType == resource)
			if (floorRes) {
				targetPos = checking
				targetRes = floorRes
				break
			}
		}
		// There were resources
		if (targetPos) {
			if (this.pos.inRangeTo(targetPos, 1)) {
				this.pickup(targetRes)
				
				if (_.isUndefined(unloadPosStr)) {
					this.popState()
				}
				else {
					this.pushState('UNLOAD', {posStr: unloadPosStr, resource: resource})
				}
			}
			else {
				this.pushState('MOVE', {posStr: RoomPosition.serialize(targetPos), range: 1})
			}
		}
		else {
			if (canPop) {
				this.popState()
			}
			else {
				this.pushState('WAIT', {until: Game.time+2})
			}
		}
	}
}
Creep.prototype.STATE_UNLOAD = function(scope) {
	let {posStr, resource, canPop=true, loadPosStr} = scope
	let posObj = RoomPosition.parse(posStr)

	// If we're not in range ..
	if (!this.pos.inRangeTo(posObj, 1)) {
		this.pushState('MOVE', {posStr: posStr})
		return
	}

	// Otherwise, if we're empty ..
	if (this.store.getUsedCapacity() == 0) {
		if (_.isUndefined(loadPosStr)) {
			this.popState()
			return
		}
		else {
			this.pushState('LOAD', {posStr: loadPosStr, resource: resource})
		}
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