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
	else if (!this.task.taskInfo.validPositions.includes(RoomPosition.serialize(this.pos))) {
		let positionMap = _.map(this.task.taskInfo.validPositions, s => RoomPosition.serialize(s))
		let targetPosition = _.find(positionMap, s => s.lookFor(LOOK_CREEPS).length == 0)
		this.pushState('MOVE', {posStr: RoomPosition.serialize(targetPosition), range: 0, errorPops: true})
	}
	else {
		this.upgradeController(controller)
		// add stats callback here?
	}
}