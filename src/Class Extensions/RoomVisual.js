RoomVisual.drawGrid = function(grid, roomName, scope={}) {
	let {reverse=false, type='linear', cutoffMax=255, cutoffMin=-1, text} = scope
    let RV = new RoomVisual(roomName)

	let valueMax = _.max(grid._bits, function(s) {
		if (s < cutoffMax) {
			return s
		}
	})
	
    for (let i in grid._bits) {
		if (!(grid._bits[i] < cutoffMax && grid._bits[i] > cutoffMin)) {
			continue
		}

		let x = Math.floor(i/50)
		let y = i%50

		let colorMax = 0.6
		let colorMin = 0

		let colorScale = colorMin + (colorMax - colorMin)
		if (reverse) {
			colorScale = colorMax - (colorMax - colorMin)
		}

		let h = colorScale*(grid._bits[i]/valueMax)
		if (type == 'sqrt') {
			h = colorScale * Math.pow(grid._bits[i]/valueMax, 0.5)
		}
		let s = 1
		let l = 0.6
		let hexColor = HSL_TO_HEX(h, s, l)

		if (text) RV.text(grid._bits[i], x, y+0.25, {stroke: '#000000', color: '#ffffff', opacity: 0.5})
		RV.rect(x-0.5, y-0.5, 1, 1, {fill: hexColor, opacity: 0.3})
    }

	if (_.isUndefined(Imperium.visuals)) {
		Imperium.visuals = {}
	}
	if (_.isUndefined(Imperium.visuals[roomName])) {
		Imperium.visuals[roomName] = []
	}
	Imperium.visuals[roomName].push({visual: RV.export(), expire: Game.time+200, init: Game.time})
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