require('require')

let imperium
if (hasRespawned()) {
	delete Memory.Imperium
	delete Memory.creeps

	imperium = new Imperium({})
	imperium.save()
	imperium.checkForSectors()
}
else {
	imperium = new Imperium(Memory.Imperium)
	imperium.load()
}

module.exports.loop = function() {
	hasRespawned()
	if (Game.time < Memory.respawnTick + 2) {
		return
	}
    else if (Game.time == Memory.respawnTick + 2) {
        console.log('Respawn complete!')

		global.Imperium = new Imperium()
		Imperium.checkForSectors()
    }

	imperium.run()
	imperium.save()
}