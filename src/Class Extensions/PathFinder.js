PathFinder.primitivePathfind = function(startPos, endPos, costMatrix=new PathFinder.CostMatrix) {
	let startPosID = RoomPosition.serialize(startPos)
	let endPosID = RoomPosition.serialize(endPos)

	class Queue {
		constructor() {
			this.nodes = []
		}

		add(score, id) {
			this.nodes.push({score: score, id: id})
			this.sort()
		}
		get() {
			return this.nodes.shift()
		}
		empty() {
			return this.nodes.length == 0
		}
		sort() {
			this.nodes = _.sortBy(this.nodes, s => s.score)
		}
	}

	let stack = []
	let distances = {}
	let previous = {}
	let path = []

	for (let x = 0; x < 50; x++) {
		for (let y = 0; y < 50; y++) {
			let newPos = new RoomPosition(x, y, startPos.roomName)
			let newID = RoomPosition.serialize(newPos)
			if (startPosID == newID) {
				distances[newID] = 0
				stack.push({score: 0, id: newID})
				stack = _.sortBy(stack, 'score')
			}
			else {
				distances[newID] = Infinity//costMatrix.get(x, y)
				// stack.push({score: Infinity, id: newID})
				// stack = _.sortBy(stack, 'score')
			}

			previous[newID] = null
		}
	}

	while (stack.length > 0) {
		let smallest = stack.shift()

		if (smallest.id == endPosID) {
			path = []

			while (previous[smallest.id]) {
				path.push(RoomPosition.parse(smallest.id))
				smallest = previous[smallest.id]
			}

			path.push(startPos)

			break
		}

		if (!smallest || distances[smallest.id] === Infinity) {
			continue
		}

		let smallestPos = RoomPosition.parse(smallest.id)
		let adjacent = smallestPos.getAdjacent({serialize: false, checkTerrain: false, diagonals: false})
		
		for (let adjIdx in adjacent) {
			let adjacentPos = adjacent[adjIdx]
			let serializedAdjacent = RoomPosition.serialize(adjacentPos)

			let tempScore = distances[smallest.id] + costMatrix.get(adjacentPos.x, adjacentPos.y)

			if (tempScore < distances[serializedAdjacent]) {
				distances[serializedAdjacent] = tempScore
				previous[serializedAdjacent] = smallest

				stack.push({score: tempScore, id: serializedAdjacent})
				stack = _.sortBy(stack, 'score')
			}
		}
	}

	return path
}

PathFinder.weightedFloodFill = function(startPos, endPos, costMatrix=new PathFinder.CostMatrix) {

	let startObj = {
		pos: startPos, 
		c: costMatrix.get(startPos.x, startPos.y), 
		w: costMatrix.get(startPos.x, startPos.y),
		from: true
	}

	let visitedHash = {}
	let toVisit = [startObj]

	visitedHash[RoomPosition.serialize(startPos)] =  startObj

	let depth = 0
	let done = false

	while (!done) {
		let next = []
		
		for (let idx in toVisit) {
			let posObj = toVisit[idx]
			let roomPos = posObj.pos

			if (posObj.c < posObj.w) {
				posObj.c += 1
				next.push(posObj)
				continue
			}

			let adjacent = roomPos.getAdjacent({diagonals: false, serialize: false, checkTerrain: false})
			for (let adjIdx in adjacent) {
				let adjPos = adjacent[adjIdx]
				let serializedPos = RoomPosition.serialize(adjPos)

				if (!_.has(visitedHash, serializedPos)) {
					let outObj = {
						pos: adjPos, 
						c: 0, 
						w: costMatrix.get(adjPos.x, adjPos.y), 
						from: RoomPosition.serialize(roomPos)
					}

					visitedHash[serializedPos] = outObj
					next.push(outObj)
				}
			}
			if (_.has(visitedHash, RoomPosition.serialize(endPos))) {
				done = true
				break
			}
		}

		if (next.length == 0) {
			done = true
		}

		depth += 1
		toVisit = next
	}

	let endObj = visitedHash[RoomPosition.serialize(endPos)]

	let path = [endObj.pos]
	let solved = false
	while (!solved) {
		let nextSerializedPos = RoomPosition.serialize(path[0])
		let hashObj = visitedHash[nextSerializedPos]

		if (hashObj.from == true) {
			solved = true
			break
		}
		let next = visitedHash[hashObj.from].pos
		path.unshift(next)
	}
	
	return path
}