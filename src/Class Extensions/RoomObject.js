RoomObject.prototype.invokeState = function() {
	if (!this.memory.stack || !this.memory.stack.length) {
		return
	}

	let [[state, scope]] = this.memory.stack
	this[`STATE_${state}`](scope)

	return
}
RoomObject.prototype.getState = function(defaultState = 'IDLE') {
	if (!this.memory.stack) {
		return defaultState
	}
	
	return this.memory.stack[0][0] || defaultState
}
RoomObject.prototype.setState = function(state, scope={}) {
	if (!this.memory.stack) {
		this.memory.stack = []
	}

	if (!this[`STATE_${state}`]) {
		console.warn(`${this.name} has no method ${state}`)
	}

	this.memory.stack[0] = [state, scope]
	return state
}
RoomObject.prototype.pushState = function(state, scope={}) {
	if (!this.memory.stack) {
		this.memory.stack = []
	}

	if (!this[`STATE_${state}`]) {
        throw new Error(`Failure to add ${state} to ${this}, No such state`)
	}
	if (this.memory.stack.length > MAX_STACK_LENGTH) {
        throw new Error(`Failure to add ${state} to ${this}, Stack too large`)
	}

	this.memory.stack.unshift([state, scope])
	this.invokeState()

	return state
}
RoomObject.prototype.popState = function() {
	if (!this.memory.stack || !this.memory.stack.length) {
		return
	}

	let [state] = this.memory.stack.shift()
}

RoomObject.prototype.skipState = function() {
	if (!this.memory.stack || !this.memory.stack.length) {
		return
	}

	this.pushState('WAIT', {until: Game.time+1})
}
RoomObject.prototype.clearStack = function() {
	this.memory.stack = [[]]
}