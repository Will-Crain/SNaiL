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