Creep.prototype.STATE_MOVE = function(scope={}) {
	let {posStr, range=1, ignoreCreeps=false, errorPops=false} = scope
	let posObj = RoomPosition.parse(posStr)

	if (this.room.name != posObj.roomName) {
		// cry
	}
	
	if (this.pos.inRangeTo(posObj, range)) {
		this.popState()
	}
	else {
		let moveOpts = {range: range, ignoreCreeps: ignoreCreeps}

		let move = this.moveTo(posObj, moveOpts)
		let allowedCodes = [-5, -11]
		if (!allowedCodes.includes(move) && errorPops) {
			this.popState()
			
			return
		}
		// Is there a stationary creep at our destination?
		let obstructingCreep = _.find(posObj.lookFor(LOOK_CREEPS), s => s.my && s.getState() != 'MOVE')
		if (!_.isUndefined(obstructingCreep) && errorPops) {
			this.popState()

			return
		}
	}
}