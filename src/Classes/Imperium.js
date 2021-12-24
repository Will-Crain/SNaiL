class Imperium {
	constructor(scope={}) {
		let {sectors={}, inquisitors={}} = scope

		this.sectors = sectors
		this.inquisitors = inquisitors

		if (_.isUndefined(Memory.Imperium)) {
			Memory.Imperium = this
		}

		this.initTime = Game.time

		return this
	}

	// Save/load
	load() {
		if (_.isUndefined(Memory.Imperium)) {
			return
		}
		
		for (let sectorName in Memory.Imperium.sectors) {

			// Load sectors
			let memSector = Memory.Imperium.sectors[sectorName]
			this.sectors[sectorName] = new Sector(memSector)

			for (let taskName in memSector.tasks) {

				// Load tasks
				this.sectors[sectorName].tasks[taskName] = new TASKS[memSector.tasks[taskName].type](memSector.tasks[taskName])
			}
		}

		global.Imperium = this
		return this
	}
	save() {
		Memory['Imperium'] = this
	}

	run() {
		let sectorKeys = _.keys(this.sectors)
		if (sectorKeys.length == 0) {
			this.checkForSectors()
		}

		this.currentTick = Game.time
		for (let sectorID in this.sectors) {
			this.sectors[sectorID].run()
		}
	}

	// Expansion
	addSector(name) {
		this.sectors[name] = new Sector({
			'name':		name,
			'level':	Game.rooms[name].controller.level
		})
	}

	// Initialization
	checkForSectors() {
		let ownedRooms = _.filter(Game.rooms, s => s.controller && s.controller.my)
		for (let roomIdx in ownedRooms) {
			if (!_.has(this.sectors, ownedRooms[roomIdx].name)) {
				this.addSector(ownedRooms[roomIdx].name)
				this.sectors[ownedRooms[roomIdx].name].init()
			}
		}
	}
}

global.Imperium = Imperium