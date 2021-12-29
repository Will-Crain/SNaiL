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

		this.draw()
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

	// Fluff
	draw() {
		for (let sectorName in this.visuals) {
			for (let idx in this.visuals[sectorName]) {
				let visualObj = this.visuals[sectorName][idx]

				if (Game.time > visualObj.expires) {
					delete this.visuals[sectorName]
					continue
				}
				if (Game.time <= visualObj.init) {
					continue
				}
	
				Game.rooms[sectorName].visual.import(visualObj.visual)
			}
		}
	}
}

global.Imperium = Imperium