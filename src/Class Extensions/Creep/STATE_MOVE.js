Creep.prototype.STATE_MOVE = function(scope) {
	let {posStr, range=1, ignoreCreeps=false, failPops=false} = scope
	let posObj = RoomPosition.parse(posStr)

	if (this.room.name != posObj.roomName) {
		// cry
	}
	
	if (this.pos.inRangeTo(posObj, range)) {
		this.popState()
	}
	else {
		let move = this.moveTo(posObj, {range: range, ignoreCreeps: ignoreCreeps, maxRooms: 1})
		let allowedCodes = [0, -5, -11]
		if (!allowedCodes.includes(move) && failPops) {
			this.say('Early pop!')
			this.popState()
		}
	}
}