RoomVisual.drawGrid = function(grid, scope={}) {
	let {roomName, reverse=false, type='linear', cutoffMax=250, cutoffMin=0} = scope
    let RV = new RoomVisual(roomName)

	let valueMax = _.max(grid._bits, function(s) {
		if (s < cutoffMax) {
			return s
		}
	})
	// let valueMax = 100
    
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

		// RV.text(grid._bits[i], x, y+0.25, {stroke: '#000000', color: '#ffffff', opacity: 0.5})
		RV.rect(x-0.5, y-0.5, 1, 1, {fill: hexColor, opacity: 0.3})
    }
}
RoomVisual.drawPath = function(path, roomName) {
	let RV = new RoomVisual(roomName)

	let newPath = _.map(path, s => [s.x, s.y])
	RV.poly(newPath, {
		lineStyle:	'dashed'
	})
}
RoomVisual.drawPositions = function(positions, roomName) {
	let RV = new RoomVisual(roomName)
	blobs = positions.reduce((prev, curr) => {
		if (prev.length) {
			let isAdjacent = _.some(prev[prev.length-1], s => curr.getRangeTo(s) == 1)
			if (isAdjacent) {
				prev[prev.length-1].push(curr)
			}
			else {
				prev.push([curr])
			}
		}
		else {
			prev.push([curr])
		}

		return prev
	}, [])

	for (let blob of blobs) {
		let serializeMap = _.map(blob, s => RoomPosition.serialize(s))

		for (let posObj of blob) {
			RV.rect(posObj.x-0.5, posObj.y-0.5, 1, 1, {
				opacity: 0.2
			})
			let top = RoomPosition.serialize(posObj.add(0, -1))
			let right = RoomPosition.serialize(posObj.add(1, 0))
			let bottom = RoomPosition.serialize(posObj.add(0, 1))
			let left = RoomPosition.serialize(posObj.add(-1, 0))

			console.log(top, right, bottom, left)
			console.log(serializeMap)
			console.log('\n')
			
			if (!serializeMap.includes(top)) {
				console.log(`${RoomPosition.serialize(posObj)}, no top ${top}!`)
				RV.line(posObj.x-0.5, posObj.y-0.5, posObj.x+0.5, posObj.y-0.5, {
					width: 0.1,
					opacity: 0.8
				})
			}
			if (!serializeMap.includes(right)) {
				console.log(`${RoomPosition.serialize(posObj)}, no right ${right}!`)
				RV.line(posObj.x+0.5, posObj.y-0.5, posObj.x+0.5, posObj.y+0.5, {
					width: 0.1,
					opacity: 0.8
				})
			}
			if (!serializeMap.includes(bottom)) {
				console.log(`${RoomPosition.serialize(posObj)}, no bottom ${bottom}!`)
				RV.line(posObj.x+0.5, posObj.y+0.5, posObj.x-0.5, posObj.y+0.5, {
					width: 0.1,
					opacity: 0.8
				})
			}
			if (!serializeMap.includes(left)) {
				console.log(`${RoomPosition.serialize(posObj)}, no left ${left}!`)
				RV.line(posObj.x-0.5, posObj.y+0.5, posObj.x-0.5, posObj.y-0.5, {
					width: 0.1,
					opacity: 0.8
				})
			}
		}
	}

	if (_.isUndefined(Imperium.visuals)) {
		Imperium.visuals = {}
	}
	Imperium.visuals[roomName] = {visual: RV.export(), expires: Game.time+200}
}