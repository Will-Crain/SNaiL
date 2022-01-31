global.Planner = {
	plan: function(roomName) {
		let terrainWalls = []
		let roomExits = []
		let edges = []

		let terrain = Game.map.getRoomTerrain(roomName)

		// Populate terrainWalls and roomExits
		for (let i = 0; i < 50; i++) {
			for (let j = 0; j < 50; j++) {
				let roomPositionObject = new RoomPosition(i, j, roomName)
				let serializedPosition = RoomPosition.serialize(roomPositionObject)

				if (i == 0 || i == 49 || j == 0 || j == 49) {
					if (terrain.get(i, j) != TERRAIN_MASK_WALL) {
						roomExits.push([serializedPosition])
					}

					edges.push([serializedPosition])
				}

				if (terrain.get(i, j) == TERRAIN_MASK_WALL) {
					let roomPositionObject = new RoomPosition(i, j, roomName)
					let serializedPosition = RoomPosition.serialize(roomPositionObject)

					terrainWalls.push([serializedPosition])
				}
			}
		}

		let terrainWallBlobs = Planner.blobArray(terrainWalls)
		let exitBlobs = Planner.blobArray(roomExits)

		// Create polygons from each blob in terrainWallBlobs
		let polygons = []
		for (let idx in terrainWallBlobs) {
			let newPolygon = new Polygon(polygons.length, terrainWallBlobs[idx])
			newPolygon.makeEdges()
			polygons.push(newPolygon)
		}
		for (let idx in exitBlobs) {
			let newPolygon = new Polygon(polygons.length, exitBlobs[idx])
			newPolygon.makeEdges()
			polygons.push(newPolygon)
		}

		let outStr = ''
		for (let polygon of polygons) {
			for (let node of polygon.edges) {
				let position = RoomPosition.parse(node)
				outStr += `${position.x} ${position.y}\n`
			}
		}
		console.log(outStr)

		RoomVisual.drawPolygons(polygons, roomName)
	},

	/**
	 * blobArray takes an array of serialized RoomPositions and returns an array of arrays. Each nested array contains only points who are contiguous with one another.
	 * @param {Array} serializedArray The array of serialized RoomPositions
	 * @returns {Array.<Array>.<String>} An array of arrays containing strings
	 */
	blobArray: function(serializedArray) {
		let blobs = serializedArray
		let done = false
	
		while (!done) {
			let isDone = true
	
			blobs = blobs.reduce( (prev, curr) => {
				let hasAdjacent = false
				for (let blob in prev) {
					if (hasAdjacent) {
						continue
					}
					for (let position in prev[blob]) {
						if (hasAdjacent) {
							continue
						}
						for (let target in curr) {
							if (RoomPosition.parse(curr[target]).isNearTo(RoomPosition.parse(prev[blob][position]))) {
								hasAdjacent = true
								isDone = false
								prev[blob].push(...curr)
								break
							}
						}
					}
				}
				if (!hasAdjacent) {
					prev.push(curr)
				}
	
				return prev
			}, [])
	
			done = isDone
		}
		
		return blobs
	},

	/**
	 * @param {Array.<Polygon>} polygons A list of polygons whose edges describe the room obstacles
	 * @returns idk what it returns yet
	 */
	voronoi: function(polygons) {

		// Create maps
		let regions = []
		let edges = []
		let points = []

		// Initialize starting diagram
		let startingPoints = [new Point(-50, -50), new Point(100, -50), new Point(100, 100), new Point(-50, 100)]
		let edgePoints = [ 
			[new Point(24.5, 24.5), new Point(24.5, -100), new Point(-100, 24.5)], 
			[new Point(24.5, 24.5), new Point(24.5, -100), new Point(150, 24.5)],
			[new Point(24.5, 24.5), new Point(24.5, 150), new Point(150, 24.5)],
			[new Point(24.5, 24.5), new Point(24.5, 150), new Point(-100, 24.5)]
		]
		
		let E = []
		for (let idx in startingPoints) {
			let newEdges = []
			for (let i in edgePoints) {
				let targetIdx = i+1==edgePoints[i].length ? 0 : i+1
				let newEdge = new Edge(edgePoints[i], edgePoints[targetIdx])
				newEdges.push(newEdge)
			}

			let newRegion = new Region(startingPoints[idx], newEdges)
			E.push(newRegion)
		}


		let edges = []
		let sites = polygons.map(...s => s.edges).map(s => new Point(s.x, s.y))

		for (let site of sites) {
			let newRegion = new Region(site)

			for (let boundingRegion of boundaries) {
				let pb = site.pb(boundingRegion.center)
				let x = []

				for (let regionEdge in boundingRegion.edges) {
					let result = testSpatial(regionEdge, pb)
					if (result > 0) {
						boundingRegion.edges.splice(regionEdge, regionEdge)
					}
					else if (result == 0) {

					}
				}
			}
		}
	}
}