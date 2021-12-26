Creep.prototype.STATE_LOAD = function(scope) {
	let {loadArray, resource, canPop=true, unloadArray} = scope

	// Are we already full?
	if (this.store.getFreeCapacity(resource) == 0) {
		this.memory.arraySpot = 0
		if (unloadArray) {
			this.pushState('UNLOAD', {unloadArray: unloadArray, resource: resource})
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

	let targetPosition = RoomPosition.parse(loadArray[this.memory.arraySpot])

	if (!this.pos.inRangeTo(targetPosition, 1)) {
		this.pushState('MOVE', {posStr: loadArray[this.memory.arraySpot]})
		return
	}
	else {
		// Check for structures
		let validStructure = _.find(targetPosition.lookFor(LOOK_STRUCTURES), s => s.store && s.store.getUsedCapacity(resource) > 0)
		if (validStructure) {
			this.withdraw(validStructure, resource)
			this.memory.arraySpot = this.memory.arraySpot == validStructures.length-1 ? 0 : this.memory.arraySpot + 1
			return
		}

		// Check for ground resources instead
		let validResource = _.find(targetPosition.lookFor(LOOK_RESOURCES), s => s.resourceType == resource)
		if (validResource) {
			this.pickup(validResource)
			this.memory.arraySpot = this.memory.arraySpot == validStructures.length-1 ? 0 : this.memory.arraySpot + 1
			return
		}

		// If neither, go to next position
		this.memory.arraySpot += 1
		if (this.memory.arraySpot > loadArray.length - 1) {
			// Consider going back to STATE_UNLOAD here
			this.memory.arraySpot = 0
			if (canPop) {
				this.popState()
			}
		}
	}
	
}