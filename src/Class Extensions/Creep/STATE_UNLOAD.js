Creep.prototype.STATE_UNLOAD = function(scope) {
	let {unloadArray, resource, canPop=true, loadArray} = scope

	// Are we already empty?
	if (this.store[resource] == 0) {
		this.memory.arraySpot = 0
		if (loadArray) {
			this.pushState('LOAD', {loadArray: loadArray, unloadArray: unloadArray, resource: resource})
		}
		else if (canPop) {
			this.popState()
		}
		else {
			this.pushState('WAIT', {until: Game.time + 3})
		}
		
		return
	}

	if (_.isUndefined(this.memory.arraySpot)) {
		this.memory.arraySpot = 0
	}

	let targetPosition = RoomPosition.parse(unloadArray[this.memory.arraySpot])
	let validStructure = _.find(targetPosition.lookFor(LOOK_STRUCTURES), s => s.store && s.store.getFreeCapacity(resource) > 0)
	let validPosition = _.find(targetPosition.lookFor(LOOK_STRUCTURES), s => OBSTACLE_OBJECT_TYPES.includes(s.structureType))

	if (validStructure) {
		if (!this.pos.inRangeTo(targetPosition, 1)) {
			this.pushState('MOVE', {posStr: RoomPosition.serialize(targetPosition), canPush: true})
		}
		else {
			this.transfer(validStructure, resource)
		}
	}
	else if (!validPosition) {
		if (!this.pos.inRangeTo(targetPosition, 0)) {
			this.pushState('MOVE', {posStr: RoomPosition.serialize(targetPosition), range: 0, canPush: true})
		}
		else {
			this.drop(resource)
		}
	}
	else {
		this.memory.arraySpot = this.memory.arraySpot == unloadArray.length-1 ? 0 : this.memory.arraySpot + 1
	}
}