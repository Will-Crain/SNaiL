RoomPosition.serialize = function(pos) {
	let x = pos.x
	let y = pos.y
	let name = pos.roomName
	
	if (x < 10) `0${x}`
	if (y < 10) `0${y}`

	return `${x}${y}${name}`
}
RoomPosition.parse = function(serPos) {
	let x = Number(serPos.substring(0, 2))
	let y = Number(serPos.substring(2, 4))
	let name = String(serPos.substring(4, serPos.length))
		
	return new RoomPosition(x, y, name)
}

/**
 * Returns an array of adjacent positions
 * @param {Object} scope - An object containing options: serialize, diagonals, checkStructures, checkTerrain
 * @param {Boolean} [scope.serialize] Controls whether this function returns serialized roompositions or fresh roomposition objects. Default is true.
 * @param {Boolean} [scope.diagonals] Controls whether diagonals in addition to base 4 directions. Default is true.
 * @param {Boolean} [scope.checkStructures] Controls whether RoomPositions with an obstructing structure should be appended to the return array. Default is false.
 * @param {Boolean} [scope.checkTerrain] Controls whether RoomPositions with terrain walls should be appended to the return array. Default is true.
 * @param {int} [scope.startRange] Controls the range to start iterating at. Default is 1
 * @param {int} [scope.endRange] Controls the range to end iterating at. Default is 1
 * @return {Array} An array of adjacent room positions according to your options
 */
RoomPosition.prototype.getAdjacent = function(scope={}) {
	let {
		diagonals=true, serialize=true, checkStructures=false, checkTerrain=true,
		startRange=1, endRange=1
	} = scope
	let targetRoom = Game.rooms[this.roomName]
		
	let terrain = targetRoom.getTerrain()
	let outArr = []
	
	for (let oRange = startRange; oRange <= endRange; oRange+=1) {
		for (let i in DIRECTIONS[oRange]) {
			if (i%2 == 0 && diagonals==false && oRange == 1) {
				continue
			}
			
			let [dx, dy] = DIRECTIONS[oRange][i]
			
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
	}
	
    return outArr
}
RoomPosition.prototype.getStandPositions = function(scope={}) {
	let {
		serialize=true, checkTerrain=true,
		range=1, type=true
	} = scope

	let targetRoom = Game.rooms[this.roomName]

	let terrain = targetRoom.getTerrain()
	let outArr = []
	for (let i = -range; i <= range; i++) {
		for (let j = -range; j <+ range; j++) {
			let testPos = this.add(i, j)

			if (checkTerrain && terrain.get(testPos.x, testPos.y) == TERRAIN_MASK_WALL) {
				continue
			}

			if (type != (testPos.x%2 == testPos.y%2)) {
				if (serialize) {
					outArr.push(RoomPosition.serialize(testPos))
				}
				else {
					outArr.push(testPos)
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