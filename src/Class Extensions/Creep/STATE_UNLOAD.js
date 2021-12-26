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
	// if (loadArray) {
	// 	this.pushState('LOAD', {loadArray: loadArray, unloadArray: unloadArray, resource: resource})
	// }
	// else if (canPop) {
	// 	this.popState()
	// }
	// else {
	// 	this.pushState('WAIT', {until: Game.time + 3})
	// }

	if (_.isUndefined(this.memory.arraySpot)) {
		this.memory.arraySpot = 0
	}

	let targetPosition = RoomPosition.parse(unloadArray[this.memory.arraySpot])

	if (!this.pos.inRangeTo(targetPosition, 1)) {
		this.pushState('MOVE', {posStr: unloadArray[this.memory.arraySpot]})
		return
	}
	else {
		// Check for structures first
		let validStructure = _.find(targetPosition.lookFor(LOOK_STRUCTURES), s => s.store && s.store.getFreeCapacity(resource) > 0)
		if (validStructure) {
			this.say(this.transfer(validStructure, resource))
			this.memory.arraySpot += 1
			return
		}
		else {

			// Check for valid floor position
			let validPosition = _.find(targetPosition.lookFor(LOOK_STRUCTURES), s => OBSTACLE_OBJECT_TYPES.includes(s.structureType))
			if (!validPosition) {
				this.moveTo(validPosition)
				this.drop(resource)
				this.memory.arraySpot += 1
				return
			}
			else {
				// If neither, go to next position
				this.memory.arraySpot += 1
				if (this.memory.arraySpot >= unloadArray.length) {
					// Consider going back to STATE_LOAD here
					this.memory.arraySpot = 0
				}

			}

		}

	}

}