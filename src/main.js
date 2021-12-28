require('require')

global.Imperium
if (hasRespawned()) {
	delete Memory.Imperium
	delete Memory.creeps

	Imperium = new Imperium({})
	Imperium.save()
	Imperium.checkForSectors()
}
else {
	Imperium = new Imperium(Memory.Imperium)
	Imperium.load()
}

module.exports.loop = function() {
	// hasRespawned()
	// if (Game.time < Memory.respawnTick + 2) {
	// 	return
	// }
    // else if (Game.time == Memory.respawnTick + 2) {
    //     console.log('Respawn complete!')

	// 	imperium = 
	// 	Imperium.checkForSectors()
    // }

	Imperium.run()
	Imperium.save()
}