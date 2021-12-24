require('require')

module.exports.loop = function() {
	if (hasRespawned()) {
		delete Memory.Imperium
		return
	}
	
	let Imperium = new IMPERIUM(Memory.Imperium || {})
	
	Imperium.save()

	Imperium.run()
	Imperium.checkForSectors()

	Imperium.load()
	
}