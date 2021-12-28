Creep.prototype.STATE_MOVE = function(scope={}) {
	let {posStr, range=1, ignoreCreeps=false, errorPops=false, canPush=false} = scope
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
		let obstructingCreep = _.find(posObj.lookFor(LOOK_CREEPS), s => s.my && (s.getState() != 'MOVE' || (s.memory._move && !s.memory._move.path)))
		if (!_.isUndefined(obstructingCreep) && canPush && this.pos.getRangeTo(obstructingCreep.pos) == 1) {
			obstructingCreep.cancelOrder('move')
			obstructingCreep.move(obstructingCreep.pos.getDirectionTo(this.pos))
			this.move(this.pos.getDirectionTo(obstructingCreep.pos))
			this.say('>:(')
			obstructingCreep.say(':(')
		}
		else if (!_.isUndefined(obstructingCreep) && errorPops) {
			this.popState()
		}
	}
}