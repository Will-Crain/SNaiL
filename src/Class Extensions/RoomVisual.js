/**
 * shoutout again to MarvinTMB for getting rid of my color space transforms
 */
 RoomVisual.drawGrid = function(grid, roomName, opts={}) {
    let {minCutoff=0, maxCutoff=255} = opts
    let RV = new RoomVisual(roomName)
    
	let valueMax = _.max(grid._bits, function(val) {
	    if (val < maxCutoff) return val
	})
	let valueMin = _.min(grid._bits, function(val) {
	    if (val > minCutoff) return val
	})
	
    for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 50; y++) {
            let gridValue = grid.get(x, y)

            if (gridValue >= maxCutoff || gridValue <= minCutoff) continue

			let [hueMin, hueMax] = [0.1, 0.6]
			let colorScale = hueMin + (hueMax - hueMin)

			let h = hueMin + colorScale*(gridValue-valueMin)/valueMax
			let s = 1
			let l = 0.6
			
			let color = `hsl(${h*360}, ${s*100}%, ${l*100}%)`

			RV.rect(x-0.5, y-0.5, 1, 1, {fill: color, opacity: 0.3})
        }
    }
}
RoomVisual.drawPath = function(path, roomName) {
	let RV = new RoomVisual(roomName)

	let newPath = _.map(path, s => [s.x, s.y])
	RV.poly(newPath, {
		lineStyle:	'dashed'
	})
}
RoomVisual.drawPositions = function(serializedPositions, roomName) {
	let RV = new RoomVisual(roomName)
	let positions = _.map(serializedPositions, s => RoomPosition.parse(s))

	for (let position of positions) {
		RV.rect(position.x-0.5, position.y-0.5, 1, 1, {
			opacity: 0.2
		})
		let top = RoomPosition.serialize(position.add(0, -1))
		let right = RoomPosition.serialize(position.add(1, 0))
		let bottom = RoomPosition.serialize(position.add(0, 1))
		let left = RoomPosition.serialize(position.add(-1, 0))
		
		if (!serializedPositions.includes(top)) {
			RV.line(position.x-0.5, position.y-0.5, position.x+0.5, position.y-0.5, {
				width: 0.1,
				opacity: 0.8
			})
		}
		if (!serializedPositions.includes(right)) {
			RV.line(position.x+0.5, position.y-0.5, position.x+0.5, position.y+0.5, {
				width: 0.1,
				opacity: 0.8
			})
		}
		if (!serializedPositions.includes(bottom)) {
			RV.line(position.x+0.5, position.y+0.5, position.x-0.5, position.y+0.5, {
				width: 0.1,
				opacity: 0.8
			})
		}
		if (!serializedPositions.includes(left)) {
			RV.line(position.x-0.5, position.y+0.5, position.x-0.5, position.y-0.5, {
				width: 0.1,
				opacity: 0.8
			})
		}
	}

	if (_.isUndefined(Imperium.visuals)) {
		Imperium.visuals = {}
	}
	if (_.isUndefined(Imperium.visuals[roomName])) {
		Imperium.visuals[roomName] = []
	}
	Imperium.visuals[roomName].push({visual: RV.export(), expire: Game.time+200, init: Game.time})
}

RoomVisual.drawPolygons = function(polygons, roomName) {
	let RV = new RoomVisual(roomName)
	for (let polygon of polygons) {
		let randColor = Math.floor(Math.random()*16777215).toString(16)
		for (let node of polygon.nodes) {
			let posObj = RoomPosition.parse(node)
			RV.rect(posObj.x-0.5, posObj.y-0.5, 1, 1, {
				opacity: 	0.25,
				fill:		`#${randColor}`
			})
		}
		for (let node of polygon.edges) {
			let posObj = RoomPosition.parse(node)
			RV.rect(posObj.x-0.5, posObj.y-0.5, 1, 1, {
				opacity: 0.25
			})
		}
	}

	if (_.isUndefined(Imperium.visuals)) {
		Imperium.visuals = {}
	}
	if (_.isUndefined(Imperium.visuals[roomName])) {
		Imperium.visuals[roomName] = []
	}
	Imperium.visuals[roomName].push({visual: RV.export(), expire: Game.time+20, init: Game.time})
}