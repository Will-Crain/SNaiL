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

/**
 * Returns an array of adjacent positions
 * @param {Object} scope - An object containing options
 * @param {Boolean} scope.serialize Return adjacent positions as object or string?
 * @param {Boolean} scope.diagonals Check Diagonals, or just 4 base directions?
 * @param {Boolean} scope.checkStructures Count structures against walkable spots?
 * @param {Boolean} scope.checkTerrain Check terrain against walkable spots?
 */
RoomPosition.prototype.getAdjacent = function(scope={}) {
	let {diagonals=true, serialize=true, checkStructures=false, checkTerrain=true} = scope
	let targetRoom = Game.rooms[this.roomName]
		
	let terrain = targetRoom.getTerrain()
	let outArr = []
		
	for (let i in DIRECTIONS) {
		if (i%2 == 0 && diagonals==false) {
			continue
		}
		
		let [dx, dy] = DIRECTIONS[i]
		
		if (checkStructures == false) {
			let terr = terrain.get(this.x+dx, this.y+dy)
			if ( !checkTerrain || (checkTerrain && terr !== TERRAIN_MASK_WALL)) {
				if (serialize) {
					outArr.push(RoomPosition.serialize(this.add(dx, dy)))
				}
				else {
					outArr.push(this.add(dx, dy))
				}
			}
		}
		
	}
	
    return outArr
}
RoomPosition.prototype.add = function(x, y) {
	if (this.x+x > 49 || this.y+y > 49 || this.x+x < 0 || this.y+y < 0) {
		return this
	}

	return new RoomPosition(this.x+x, this.y+y, this.roomName)
}