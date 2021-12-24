require('require')

let imperium = new Imperium(Memory.Imperium || {})
imperium.load()

module.exports.loop = function() {
	// if (hasRespawned()) {
	// 	delete Memory.Imperium
	// 	delete Memory.creeps

	// 	imperium = new Imperium({})
	// 	imperium.load()
	// 	imperium.checkForSectors()
	// 	console.log('Respawned!')
	// }

	imperium.run()
	imperium.save()
}