Creep.prototype.run = function() {
	if (this.spawning) {
		return
	}

	try {
		this.loadStates()
		this[this.states[0]]()
		this.saveStates()
	}
	catch(e) {
		console.warn(e.stack || e)
	}
}

// State stack stuff
Creep.prototype.loadStates = function() {
	this.states = this.memory.states
}
Creep.prototype.saveStates = function() {
	this.memory.states = this.states
}

Creep.prototype.popState = function() {
	this.states.shift()
}
Creep.prototype.pushState = function(state) {
	this.states.push(state)
}

Creep.prototype.ROLE_GATHERER = function() {
	let state = this.memory.stateInfo.state
	if (!this.memory.stateInfo) {
		console.warn(`No state info for ${this.name}`)
		return
	}

	let states = {
		STATE_MOVING: function() {
			let targetPosition = RoomPosition.deserialize(this.memory.stateInfo.targetPosition)
			let targetSource = Game.getObjectById(this.memory.stateInfo.targetSource)
		}
	}
}

Creep.prototype.STATE_MOVING = function() {
	let targetPos = RoomPosition.deserialize(this.memory.stateInfo.targetPos)
	if (this.pos.isNearTo(targetPos)) {
		this.pop
	}
}