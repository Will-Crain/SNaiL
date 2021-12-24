require('require')

if (hasRespawned()) {
	delete Memory.Imperium
	return
}

let imperium = new Imperium(Memory.Imperium || {})
imperium.load()
imperium.checkForSectors()
imperium.initTime = Game.time

module.exports.loop = function() {
	imperium.run()
	imperium.save()

}