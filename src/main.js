require('require')

module.exports.loop = function() {
	for (let roomName in Game.rooms) {
		let room = Game.rooms[roomName]
		if (room.controller && room.controller.my) {
			try {
				room.run()

			}
			catch(e) {
				console.log(e.stack || e)
			}
		}
	}
}