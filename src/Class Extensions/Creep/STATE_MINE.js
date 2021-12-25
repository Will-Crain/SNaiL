Creep.prototype.STATE_MINE = function(scope) {
	let {sourcePosStr, standPositions} = scope
	let sourcePosObj = RoomPosition.parse(sourcePosStr)

	// Are we next to the source already?
	if (this.pos.inRangeTo(sourcePosObj, 1)) {
		let source = Game.getObjectById(this.task.taskInfo.sourceID)

		// Is the source empty?
		// NEEDS TO BE REFACTORED TO ACCOUNT FOR MINERALS VVVVVVVVV
		if (source.energy == 0) {
			// Are we empty?
			if (this.store.getUsedCapacity() == 0) {
				this.pushState('WAIT', {until: Game.time + source.ticksToRegeneration})
				return
			}

			// Do we have a container?
			let container = _.find(this.pos.lookFor(LOOK_STRUCTURES), s => s.structureType == STRUCTURE_CONTAINER)
			if (!container) {
				// Do we have a construction site for a container?
				let conSite = _.find(this.pos.lookFor(LOOK_CONSTRUCTION_SITES), s => s.structureType == STRUCTURE_CONTAINER)
				if (!conSite) {
					this.pushState('WAIT', {until: Game.time + source.ticksToRegeneration})
					return
				}

				this.build(conSite)
				return
			}

			this.repair(container)
			return
		}

		// Are we full?
		if (this.store.getFreeCapacity() == 0) {
			let conSites = this.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 3)
			if (conSites) {
				this.build(_.first(conSites))
				return
			}
		}
		
		this.harvest(source)
	}
	else {
		if (_.isUnefined(this.memory.arraySpot)) {
			this.memory.arraySpot = 0
		}

		let targetPosition = RoomPosition.parse(standPositions[this.memory.arraySpot])

		// Are we in range? If not, move there, but allow the state to fail and iterate targetPosition
		// in case we find ourselves here again
		if (!this.pos.inRangeTo(targetPosition, 0)) {
			this.memory.arraySpot += 1
			this.pushState('MOVE', {posStr: standPositions[this.memory.arraySpot], failPops: true})
		}
	}
}