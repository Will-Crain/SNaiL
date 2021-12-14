RoomPosition.serialize = function(pos) {
	let x = pos.x
	let y = pos.y
	let name = pos.roomName
	
	if (x < 10) {
		x = '0' + String(x)
	}
	if (y < 10) {
		y = '0' + String(y)
	}
	return String(String(x) + String(y) + name)
}
RoomPosition.parse = function(serPos) {
	let x = Number(serPos.substring(0, 2))
	let y = Number(serPos.substring(2, 4))
	let name = String(serPos.substring(4, serPos.length))
		
	return new RoomPosition(x, y, name)
}

RoomPosition.prototype.getAdjacent = function(checkStructures = false) {
	let targetRoom = Game.rooms[this.roomName]
		
	let terrain = targetRoom.getTerrain()
	let outStrArr = []
		
	for (let i in DIRECTIONS) {
		let [dx, dy] = DIRECTIONS[i]
		
		if (checkStructures == false) {
			let terr = terrain.get(this.x+dx, this.y+dy)
			if (terr !== TERRAIN_MASK_WALL) {
				outStrArr.push(RoomPosition.serialize(this.add(dx, dy)))
			}
		}
		
	}
	
    return outStrArr
}
RoomPosition.prototype.add = function(x, y) {
	if (this.x+x > 49 || this.y+y > 49 || this.x+x < 0 || this.y+y < 0) {
		return this
	}

	return new RoomPosition(this.x+x, this.y+y, this.roomName)
}