Creep.prototype.STATE_LOAD = function(scope) {
	let {posStr, resource, canPop=true, unloadPosStr, alsoCheck} = scope
	let posObj = RoomPosition.parse(posStr)

	// If we're not in range ..
	if (!this.pos.inRangeTo(posObj, 1)) {
		this.pushState('MOVE', {posStr: posStr})
		return
	}

	// If we're already full ..
	if (this.store.getFreeCapacity(resource) == 0) {
		if (canPop) {
			this.popState()
			return
		}
		else if (unloadPosStr) {
			this.pushState('UNLOAD', {posStr: unloadPosStr, resource: resource, canPop: false, loadPosStr: posStr})
			return
		}
		else {
			this.pushState('WAIT', {until: Game.time + 3})
		}
	}


	// If we're fine, find an object to take from
	let targetObj = _.find(posObj.lookFor(LOOK_STRUCTURES), s => s.store && s.store.getUsedCapacitY(resource) > 0)
	if (targetObj) {
		let transaction = this.withdraw(targetObj, resource)
		if (_.isUndefiend(unloadPosStr)) {
			this.popState()
		}
		else {
			this.pushState('UNLOAD', {posStr: unloadPosStr, resource: resource})
		}
	}
	// But if there's no object, check the floor
	else if (alsoCheck)  {
		let alsoCheckParsed = _.map(alsoCheck, s => RoomPosition.parse(s))

		let resources = _.map(alsoCheckParsed, s => _.filter(s.lookFor(LOOK_RESOURCES), t => t.resourceType == resource))

		let targetResource = _.max(resources, s => s.amount)
		if (!targetResource) {
			// cry?
		}
		if (this.pos.inRangeTo(targetResource, 1)) {
			this.pickup(targetResource)
		}
		else {
			// change this to `MOVE` state? idk
			this.moveTo(targetResource)
		}

	}
}
Creep.prototype.STATE_UNLOAD = function(scope) {
	let {posStr, resource, canPop=true, loadPosStr} = scope
	let posObj = RoomPosition.parse(posStr)

	// If we're not in range ..
	if (!this.pos.inRangeTo(posObj, 1)) {
		this.pushState('MOVE', {posStr: posStr})
		return
	}

	// Otherwise, if we're empty ..
	if (this.store.getUsedCapacity() == 0) {
		if (_.isUndefined(loadPosStr)) {
			this.popState()
			return
		}
		else {
			this.pushState('LOAD', {posStr: loadPosStr, resource: resource})
		}
	}

	// Otherwise,
	else {
		// Edge case? If a creep deposits before this, it has nowhere to go. Reserve space?
		let targetObj = _.find(posObj.lookFor(LOOK_STRUCTURES), s => s.store && s.store.getFreeCapacity(resource) > 0)
		if (!targetObj) {
			this.popState()
		}

		let transaction = this.transfer(targetObj, resource)
		let popReturns = [-8, 0]
		if (popReturns.includes(transaction)) {
			this.popState()
		}
	}
}