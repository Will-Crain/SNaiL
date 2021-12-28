Creep.prototype.STATE_UPGRADE = function(scope) {
	let {controllerPos, controllerID, loadFrom, canPop=true} = scope

	let controller = Game.getObjectById(controllerID)
	
	// Are we in our position?
	let serializedPosition = RoomPosition.serialize(this.pos)
	if (this.task.taskInfo.validPositions.includes(serializedPosition)) {
		// Are we empty?
		if (this.store[RESOURCE_ENERGY] == 0) {
			if (canPop) {this.popState(); return}
			
			this.pushState('LOAD', {loadArray: loadFrom, canPop: true, resource: RESOURCE_ENERGY})
		}
		else {
			this.upgradeController(controller)
		}
	}
	else {
		this.say(':(')
		let positionMap = _.map(this.task.taskInfo.validPositions, s => RoomPosition.parse(s))
		let targetPosition = _.find(positionMap, s => !_.some(s.lookFor(LOOK_CREEPS), t => t.getState() != 'MOVE'))
		this.pushState('MOVE', {posStr: RoomPosition.serialize(targetPosition), range: 0, errorPops: true})
	}
}