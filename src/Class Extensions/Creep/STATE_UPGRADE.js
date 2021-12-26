Creep.prototype.STATE_UPGRADE = function(scope) {
	let {controllerPos, controllerID, loadFrom, canPop=true} = scope

	let controller = Game.getObjectById(controllerID)
	
	// Are we empty?
	if (this.store[RESOURCE_ENERGY] == 0) {
		if (canPop) {
			this.popState()
		}
		else {
			this.pushState('LOAD', {loadArray: loadFrom, resource: RESOURCE_ENERGY})
		}
	}
	// Otherwise, check if in range
	else if (!this.pos.inRangeTo(controller, 3)) {
		this.pushState('MOVE', {posStr: controllerPos, range: 3})
	}
	else {
		this.upgradeController(controller)
		// add stats callback here?
	}
}