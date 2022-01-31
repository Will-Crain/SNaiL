const util = require('util')
const fs = require('fs')
const _ = require('lodash')
require('./Geometry')

// Order is red -> green -> blue -> cyan -> magenta -> yellow -> black
const colors = ['#00A080', '#A000A0', '#A0A000', '#A00000', '#00A000', '#0000A0', '#000000']

function makeID() {
	return `${Math.random().toString(36).slice(2, 11)}`.toUpperCase()
}

class Voronoi {
	constructor(scope) {
		this.points = []
		this.edges = []
		this.regions = []

		this.drawOffset=new Point(10, 10)
		this.bounds = [-1, 50]

		this.resolution = 0
		// this.resolution = Number.EPSILON * 1e4

		this.toDraw = []

		return this
	}

	repair(repairRegion, epsilon = 1e-10) {

		let checked = {}
		let toFilter = []

		for (let edge of repairRegion.edges) {
			let edgeMap = edge.points.map(s => s.id)
			checked[edge.id] = {}

			for (let refEdge of repairRegion.edges) {
				if ( (checked[edge.id] && checked[edge.id][refEdge.id]) || (checked[refEdge.id] && checked[refEdge.id][edge.id])) continue
				if (refEdge.id == edge.id) continue

				checked[edge.id][refEdge.id] = true

				// Check if `edge` and `refEdge` share a point
				let sharesPoint = refEdge.points.some(s => edgeMap.includes(s.id))
				if (!sharesPoint) continue

				// Are these actually collinear
				let directionDiff = edge.direction.sub(refEdge.direction)
				if (directionDiff.length > epsilon) continue

				let sharedPoint = refEdge.points.find(s => edgeMap.includes(s.id))
				let pooledPoints = [...refEdge.points, ...edge.points]
				
				console.log(pooledPoints.filter(s => s.id != sharedPoint.id))

				edge.points = pooledPoints.filter(s => s.id != sharedPoint.id)
				for (let region of this.regions) {
					if (region.edges.find(s => s.points.some(t => t.id == sharedPoint.id))) {
						let edges = region.edges.filter(s => !s.points.some(t => t.id == sharedPoint.id))
						toFilter.push({region: region, edges: edges})
					}
				}
			}
		}

		for (let {region, edges} of toFilter) {
			region.edges = edges
		}
	}
	slice(newRegion, oldRegion) {

		let connector = new Edge([newRegion.center, oldRegion.center])
		let bisector = connector.bisector()

		// Get our intersection points, or early return if the the bisector doesn't intersect `toRegion`
		let intercepts = oldRegion.intercepts(bisector)
		if (intercepts.length == 0) return
		// Iterate through intercepts, creating split edges and mutating anchor edges

		// Construct `newEdge`
		let newEdge = new Edge([], false)
		for (let {intercept, edgeIdx} of intercepts) {
			let edge = oldRegion.edges[edgeIdx]

			let addPoint = edge.points.find(p => p.distanceTo(intercept) < 1e-3)

			if (addPoint) newEdge.points.push(addPoint)
			else newEdge.points.push(intercept)
		}

		// Make sure the edge has it's points ordered correctly
		if (connector.getSide(newEdge.points[0]) < connector.getSide(newEdge.points[1])) newEdge.points.reverse()
		
		// Split & mutate edges to accommodate `newEdge`
		let splitEdges = []
		for (let {intercept, lambda, edgeIdx} of intercepts) {
			if (lambda > 1 || lambda < 0) continue
			let edge = oldRegion.edges[edgeIdx]

			// Mutate and split edges
			let anchorPoint = edge.points.find(point => newEdge.getSide(point) < 0)
			if (!anchorPoint) continue
			let splitPoint = edge.points.find(point => point.id != anchorPoint.id)

			let splitEdge = new Edge([splitPoint, intercept], edge.isEdge)

			oldRegion.edges[edgeIdx].points = [anchorPoint, intercept]
			oldRegion.edges.push(splitEdge)

			let adjRegion = this.regions.find(region => region.edges.some(refEdge => refEdge.id == edge.id) && region.id != oldRegion.id)
			if (adjRegion) adjRegion.edges.push(splitEdge)

			// Is there a region on the other side we need to update?
			if (edge.isEdge) continue

			// Do these two regions already share an edge? Remove it if they do
			let toRegionMap = oldRegion.edges.map(s => s.id)
			let sharedEdge = newRegion.edges.find(refEdge => toRegionMap.includes(refEdge.id))
			if (sharedEdge && !sharedEdge.isEdge) {
				newRegion.edges = newRegion.edges.filter(s => s.id != sharedEdge.id)
				oldRegion.edges = oldRegion.edges.filter(s => s.id != sharedEdge.id)
			}

			// Add the split edge to the adjacent region
			// if (!adjRegion) continue
			// adjRegion.edges.push(splitEdge)
		}

		// Mark all edges left of the bisector to be removed and/or donated
		let edgesToFilter = oldRegion.edges.filter(edge => edge.points.some(point => newEdge.getSide(point) < 0))
		for (let edge of edgesToFilter) {
			newRegion.edges.push(edge)
		}
		oldRegion.edges = oldRegion.edges.filter(s => !edgesToFilter.map(t => t.id).includes(s.id))

		oldRegion.edges.push(newEdge)
		newRegion.edges.push(newEdge)

		return {
			splitEdges: splitEdges,
			region: oldRegion
		}
	}

	addSite(site) {
		// this.toDraw = []

		// Does this site already exist?
		if (this.regions.some(s => s.center.x == site.x && s.center.y == site.y)) return

		// Is this the first site being added?
		if (this.regions.length == 0) {
			// Initialize points at boundaries
			let points = [
				new Point(this.bounds[0], this.bounds[0]),
				new Point(this.bounds[1], this.bounds[0]),
				new Point(this.bounds[1], this.bounds[1]),
				new Point(this.bounds[0], this.bounds[1])
			]
			let edges = [ 
				new Edge([points[0], points[1]], true),
				new Edge([points[1], points[2]], true),
				new Edge([points[2], points[3]], true),
				new Edge([points[3], points[0]], true)
			]
			let region = new Region(site, [edges[0], edges[1], edges[2], edges[3]])
			this.regions = [region]

			return
		}

		// Initialize new region
		let newRegion = new Region(site)

		// Check if each region can be bisected and XOR union if they can be
		let splitEdges = {}
		let visitedRegions = []

		for (let region of this.regions) {
			let {splittingRegion, splitEdges} = this.slice(newRegion, region)

			if (!splittingRegion) continue
			splitEdges[splittingRegion] = splitEdges
		}



		this.regions.push(newRegion)
	}

	draw() {
		let outStr = ''

		let points = `${this.drawOffset.x},${this.drawOffset.y} ${this.drawOffset.x},${this.drawOffset.y+49*this.scale} ${this.drawOffset.x+49*this.scale},${this.drawOffset.y+49*this.scale} ${this.drawOffset.x+49*this.scale},${this.drawOffset.y}`
		// outStr += `<polygon points="${points}" fill="none" stroke="grey" stroke-width="${1}"></polygon>\n`

		for (let region of this.regions) {
			outStr += `${region.getStr({
				drawOffset: this.drawOffset, 
				scale: this.scale
			})}\n`
		}

		for (let str of this.toDraw) {
			outStr += `${str}\n`
		}

		return outStr
	}
}

let V = new Voronoi({scale: 4})

function randomPoints(n=1) {
	let sites = []

	for (let i = 0; i < n; i++) {
		let x, y
		while ( (!x || !y) || (sites.some(s => s.x == x && s.y == y))) {
			x = 1+Math.floor(Math.random()*49)
			y = 1+Math.floor(Math.random()*49)
		}
		sites.push([x, y])
	}
	
	return sites
}

let testRoom = [
 	[0,0],[0,1], [0,2],[0,11],[0,12],[0,13],[0,14],[0,15],[0,16],[0,25],[0,26],[0,27],[0,28],[0,29],[0,35],[0,36],[0,37],[0,38],[0,39],[0,40],[0,41],[0,42],[0,43],[0,44],[0,45],[0,46],[0,47],[0,48],[0,49],
 	[1,0],[1,1],[1,2],[1,12],[1,13],[1,14],[1,38],[1,39],[1,40],[1,41],[1,44],[1,45],[1,46],[1,47],[1,48],[1,49],
 	[2,0],[2,1],[2,2],[2,3],[2,31],[2,32],[2,33],[2,34],[2,35],[2,45],[2,46],[2,47],[2,48],[2,49],
 	[3,0],[3,1],[3,2],[3,3],[3,4],[3,29],[3,30],[3,31],[3,32],[3,33],[3,34],[3,35],[3,36],[3,45],[3,46],[3,47],[3,48],[3,49],
 	[4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[4,17],[4,18],[4,19],[4,28],[4,29],[4,30],[4,31],[4,32],[4,33],[4,34],[4,35],[4,36],[4,37],[4,44],[4,45],[4,46],[4,47],[4,48],[4,49],
 	[5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[5,16],[5,17],[5,18],[5,19],[5,20],[5,27],[5,28],[5,29],[5,30],[5,31],[5,32],[5,33],[5,34],[5,35],[5,36],[5,37],[5,43],[5,44],[5,45],[5,46],[5,47],[5,48],[5,49],
 	[6,0],[6,1],[6,2],[6,3],[6,4],[6,16],[6,17],[6,18],[6,19],[6,20],[6,21],[6,22],[6,23],[6,24],[6,25],[6,26],[6,27],[6,28],[6,29],[6,30],[6,31],[6,32],[6,33],[6,34],[6,35],[6,36],[6,42],[6,43],[6,44],[6,45],[6,46],[6,47],[6,48],[6,49],
 	[7,0],[7,1],[7,2],[7,3],[7,8],[7,9],[7,16],[7,17],[7,18],[7,19],[7,20],[7,21],[7,22],[7,23],[7,24],[7,25],[7,26],[7,27],[7,28],[7,29],[7,30],[7,31],[7,32],[7,33],[7,34],[7,35],[7,42],[7,43],[7,44],[7,45],[7,46],[7,47],[7,48],[7,49],
 	[8,0],[8,1],[8,2],[8,3],[8,4],[8,7],[8,8],[8,9],[8,10],[8,16],[8,17],[8,18],[8,19],[8,20],[8,21],[8,22],[8,23],[8,24],[8,25],[8,26],[8,27],[8,28],[8,29],[8,30],[8,31],[8,32],[8,33],[8,34],[8,43],[8,44],[8,45],[8,46],[8,47],[8,48],[8,49],
 	[9,0],[9,1],[9,2],[9,3],[9,4],[9,5],[9,6],[9,7],[9,8],[9,9],[9,10],[9,11],[9,16],[9,17],[9,18],[9,19],[9,20],[9,21],[9,22],[9,23],[9,24],[9,25],[9,26],[9,27],[9,28],[9,29],[9,30],[9,31],[9,32],[9,43],[9,44],[9,45],[9,46],[9,47],[9,48],[9,49],
 	[10,0],[10,1],[10,2],[10,3],[10,4],[10,5],[10,6],[10,7],[10,8],[10,9],[10,10],[10,11],[10,15],[10,16],[10,17],[10,18],[10,19],[10,20],[10,21],[10,22],[10,23],[10,24],[10,25],[10,26],[10,27],[10,28],[10,29],[10,30],[10,31],[10,43],[10,44],[10,45],[10,46],[10,47],[10,48],[10,49],
 	[11,0],[11,1],[11,2],[11,3],[11,4],[11,5],[11,6],[11,7],[11,8],[11,9],[11,10],[11,11],[11,12],[11,15],[11,16],[11,17],[11,18],[11,19],[11,20],[11,21],[11,22],[11,23],[11,24],[11,25],[11,26],[11,27],[11,28],[11,29],[11,30],[11,42],[11,43],[11,44],[11,45],[11,46],[11,47],[11,48],[11,49],
 	[12,0],[12,1],[12,2],[12,3],[12,4],[12,5],[12,6],[12,7],[12,8],[12,9],[12,10],[12,11],[12,12],[12,16],[12,17],[12,18],[12,19],[12,20],[12,21],[12,22],[12,23],[12,24],[12,25],[12,26],[12,27],[12,28],[12,29],[12,30],[12,42],[12,43],[12,44],[12,45],[12,46],[12,47],[12,48],[12,49],
 	[13,0],[13,1],[13,2],[13,3],[13,4],[13,5],[13,6],[13,7],[13,8],[13,9],[13,10],[13,11],[13,12],[13,18],[13,19],[13,20],[13,21],[13,22],[13,23],[13,24],[13,25],[13,26],[13,27],[13,28],[13,29],[13,30],[13,42],[13,43],[13,44],[13,45],[13,46],[13,47],[13,48],[13,49],
 	[14,0],[14,1],[14,2],[14,3],[14,4],[14,5],[14,6],[14,7],[14,8],[14,9],[14,10],[14,11],[14,12],[14,19],[14,20],[14,21],[14,22],[14,23],[14,26],[14,27],[14,28],[14,29],[14,30],[14,43],[14,44],[14,45],[14,46],[14,47],[14,48],[14,49],
 	[15,0],[15,1],[15,2],[15,3],[15,4],[15,5],[15,6],[15,7],[15,8],[15,9],[15,10],[15,11],[15,12],[15,19],[15,20],[15,21],[15,22],[15,28],[15,29],[15,30],[15,31],[15,34],[15,45],[15,46],[15,47],[15,48],[15,49],[16,0],
 	[16,1],[16,2],[16,3],[16,4],[16,5],[16,6],[16,7],[16,8],[16,9],[16,10],[16,11],[16,18],[16,19],[16,20],[16,21],[16,29],[16,30],[16,31],[16,32],[16,33],[16,34],[16,35],[16,46],[16,47],[16,48],[16,49],
 	[17,0],[17,1],[17,2],[17,3],[17,4],[17,5],[17,6],[17,7],[17,8],[17,9],[17,10],[17,17],[17,18],[17,19],[17,20],[17,21],[17,29],[17,30],[17,31],[17,32],[17,33],[17,34],[17,35],[17,46],[17,47],[17,48],[17,49],
 	[18,2],[18,3],[18,4],[18,5],[18,6],[18,7],[18,8],[18,9],[18,16],[18,17],[18,18],[18,19],[18,20],[18,21],[18,22],[18,30],[18,31],[18,32],[18,33],[18,34],[18,35],[18,46],[18,47],[18,48],[18,49],
 	[19,3],[19,4],[19,16],[19,17],[19,18],[19,19],[19,20],[19,21],[19,22],[19,23],[19,33],[19,34],[19,46],[19,47],[19,48],[19,49],
 	[20,16],[20,17],[20,18],[20,19],[20,20],[20,21],[20,22],[20,23],[20,47],[20,48],[20,49],
 	[21,15],[21,16],[21,17],[21,18],[21,19],[21,20],[21,21],[21,22],[21,23],[21,48],[21,49],
 	[22,11],[22,12],[22,13],[22,14],[22,15],[22,16],[22,17],[22,18],[22,19],[22,20],[22,21],[22,22],[22,37],[22,38],[22,49],
 	[23,10],[23,11],[23,12],[23,13],[23,14],[23,15],[23,16],[23,17],[23,18],[23,19],[23,20],[23,21],[23,36],[23,37],[23,38],[23,39],[23,40],[23,41],[23,42],[23,43],[23,49],
 	[24,9],[24,10],[24,11],[24,12],[24,13],[24,14],[24,15],[24,16],[24,17],[24,18],[24,19],[24,20],[24,31],[24,32],[24,36],[24,37],[24,38],[24,39],[24,40],[24,41],[24,42],[24,43],[24,44],[24,49],
 	[25,5],[25,6],[25,7],[25,8],[25,9],[25,10],[25,11],[25,12],[25,13],[25,14],[25,15],[25,16],[25,17],[25,18],[25,30],[25,31],[25,32],[25,33],[25,37],[25,38],[25,39],[25,40],[25,41],[25,42],[25,43],[25,44],[25,49],
 	[26,4],[26,5],[26,6],[26,7],[26,8],[26,9],[26,10],[26,11],[26,12],[26,13],[26,14],[26,15],[26,16],[26,17],[26,30],[26,31],[26,32],[26,33],[26,34],[26,37],[26,38],[26,39],[26,40],[26,41],[26,42],[26,43],[26,44],[26,45],[26,49],
 	[27,4],[27,5],[27,6],[27,7],[27,8],[27,9],[27,10],[27,11],[27,12],[27,13],[27,14],[27,15],[27,16],[27,30],[27,31],[27,32],[27,33],[27,34],[27,38],[27,39],[27,42],[27,43],[27,44],[27,45],[27,49],
 	[28,4],[28,5],[28,6],[28,7],[28,8],[28,9],[28,10],[28,11],[28,12],[28,13],[28,14],[28,15],[28,30],[28,31],[28,32],[28,33],[28,34],[28,43],[28,44],[28,49],
 	[29,3],[29,4],[29,5],[29,6],[29,7],[29,8],[29,10],[29,11],[29,12],[29,13],[29,14],[29,31],[29,32],[29,33],[29,49],
 	[30,2],[30,3],[30,4],[30,5],[30,6],[30,7],[30,11],[30,12],[30,13],[30,14],[30,49],
 	[31,2],[31,3],[31,4],[31,5],[31,6],[31,10],[31,11],[31,12],[31,13],[31,14],[31,49],
 	[32,2],[32,3],[32,4],[32,5],[32,9],[32,10],[32,11],[32,12],[32,13],[32,19],[32,20],[32,21],[32,39],[32,40],[32,49],
 	[33,2],[33,3],[33,4],[33,9],[33,10],[33,11],[33,12],[33,13],[33,18],[33,19],[33,20],[33,21],[33,22],[33,34],[33,35],[33,38],[33,39],[33,40],[33,41],[33,49],
 	[34,2],[34,3],[34,10],[34,11],[34,12],[34,13],[34,14],[34,18],[34,19],[34,20],[34,21],[34,22],[34,23],[34,24],[34,33],[34,34],[34,35],[34,36],[34,37],[34,38],[34,39],[34,40],[34,41],[34,48],[34,49],
 	[35,0],[35,1],[35,2],[35,3],[35,11],[35,12],[35,13],[35,14],[35,19],[35,20],[35,21],[35,22],[35,23],[35,24],[35,25],[35,26],[35,32],[35,33],[35,34],[35,35],[35,36],[35,37],[35,38],[35,39],[35,40],[35,41],[35,42],[35,47],[35,48],[35,49],
 	[36,0],[36,1],[36,2],[36,12],[36,13],[36,19],[36,20],[36,21],[36,22],[36,23],[36,24],[36,25],[36,26],[36,27],[36,28],[36,29],[36,30],[36,31],[36,32],[36,33],[36,34],[36,35],[36,36],[36,37],[36,38],[36,39],[36,40],[36,41],[36,42],[36,47],[36,48],[36,49],
 	[37,0],[37,1],[37,7],[37,8],[37,9],[37,20],[37,21],[37,22],[37,23],[37,24],[37,25],[37,26],[37,27],[37,28],[37,29],[37,30],[37,31],[37,32],[37,33],[37,34],[37,35],[37,36],[37,37],[37,38],[37,39],[37,40],[37,41],[37,42],[37,47],[37,48],[37,49],
 	[38,0],[38,6],[38,7],[38,8],[38,9],[38,10],[38,21],[38,22],[38,23],[38,24],[38,25],[38,26],[38,27],[38,28],[38,29],[38,30],[38,31],[38,32],[38,33],[38,34],[38,35],[38,36],[38,37],[38,38],[38,39],[38,40],[38,41],[38,47],[38,48],[38,49],
 	[39,0],[39,5],[39,6],[39,7],[39,8],[39,9],[39,10],[39,11],[39,23],[39,24],[39,25],[39,26],[39,27],[39,28],[39,29],[39,30],[39,31],[39,32],[39,33],[39,34],[39,35],[39,36],[39,37],[39,38],[39,39],[39,40],[39,41],[39,47],[39,48],[39,49],
 	[40,5],[40,6],[40,7],[40,8],[40,9],[40,10],[40,11],[40,12],[40,13],[40,14],[40,24],[40,25],[40,26],[40,27],[40,28],[40,29],[40,30],[40,31],[40,32],[40,33],[40,34],[40,35],[40,36],[40,37],[40,38],[40,39],[40,40],[40,41],[40,47],[40,48],[40,49],
 	[41,5],[41,6],[41,7],[41,8],[41,9],[41,10],[41,11],[41,12],[41,13],[41,14],[41,15],[41,24],[41,25],[41,26],[41,27],[41,28],[41,29],[41,30],[41,31],[41,32],[41,33],[41,34],[41,35],[41,36],[41,37],[41,38],[41,39],[41,40],[41,41],[41,47],[41,48],[41,49],[42,6],[42,7],[42,8],[42,9],[42,10],[42,11],[42,12],[42,13],[42,14],[42,15],[42,24],[42,25],[42,26],[42,27],[42,28],[42,29],[42,30],[42,31],[42,32],[42,33],[42,34],[42,35],[42,36],[42,37],[42,38],[42,39],[42,40],[42,41],[42,48],[42,49],[43,9],[43,10],[43,11],[43,12],[43,13],[43,14],[43,15],[43,16],[43,24],[43,25],[43,26],[43,27],[43,28],[43,29],[43,30],[43,31],[43,32],[43,33],[43,34],[43,35],[43,36],[43,37],[43,38],[43,39],[43,40],[43,48],[43,49],[44,10],[44,11],[44,12],[44,13],[44,14],[44,15],[44,16],[44,17],[44,18],[44,24],[44,25],[44,26],[44,27],[44,28],[44,29],[44,30],[44,31],[44,32],[44,33],[44,34],[44,35],[44,36],[44,48],[44,49],[45,0],[45,10],[45,11],[45,12],[45,13],[45,14],[45,15],[45,16],[45,17],[45,18],[45,19],[45,24],[45,25],[45,26],[45,27],[45,28],[45,29],[45,30],[45,31],[45,32],[45,33],[45,34],[45,47],[45,48],[45,49],[46,0],[46,10],[46,11],[46,12],[46,13],[46,14],[46,15],[46,16],[46,17],[46,18],[46,19],[46,25],[46,26],[46,27],[46,28],[46,29],[46,30],[46,31],[46,32],[46,33],[46,47],[46,48],[46,49],[47,0],[47,1],[47,10],[47,11],[47,12],[47,13],[47,14],[47,15],[47,16],[47,17],[47,18],[47,19],[47,25],[47,26],[47,27],[47,28],[47,29],[47,30],[47,31],[47,32],[47,46],[47,47],[47,48],[47,49],[48,0],[48,1],[48,2],[48,3],[48,4],[48,9],[48,10],[48,11],[48,12],[48,13],[48,14],[48,15],[48,16],[48,17],[48,18],[48,19],[48,20],[48,24],[48,25],[48,26],[48,27],[48,28],[48,29],[48,30],[48,31],[48,32],[48,46],[48,47],[48,48],[48,49],[49,0],[49,1],[49,2],[49,3],[49,4],[49,5],[49,6],[49,7],[49,8],[49,9],[49,10],[49,11],[49,12],[49,13],[49,14],[49,15],[49,16],[49,17],[49,18],[49,19],[49,20],[49,21],[49,22],[49,23],[49,24],[49,25],[49,26],[49,27],[49,28],[49,29],[49,30],[49,31],[49,32],[49,45],[49,46],[49,47],[49,48],[49,49]
]

// let sites = randomPoints(4)
// let sites = [
// 	[5, 24], [45, 35], [19, 20]
// ]

let sites = [
	// [5, 24], [40, 40], [32, 13]
	// [5, 24], [32, 13], [40, 40]
	[32, 13], [5, 24], [40, 40], [20, 20]
	// [32, 13], [40, 40], [5, 24]
]

for (let siteIdx in sites) {
	let np = new Point(sites[siteIdx][0], sites[siteIdx][1])
	V.toDraw.push(np.getStr({color: colors[siteIdx], scale: 4, drawOffset: V.drawOffset}))
}
// V.toDraw.push(np.getStr({color: 'black', scale: 4, drawOffset: V.drawOffset}))

// Meta stuff used for drawing
function draw(diagramDraw, refresh=true) {
	let outStr = ''
	if (refresh) {
		outStr += `<meta http-equiv='refresh' content='1'><html><head><script></script></head><body><svg width="220" height="220">\n`
	}
	else {
		outStr += `<html><head><script></script></head><body><svg width="220" height="220">\n`
	}

	for (let str of diagramDraw) {
		outStr += `${str}\n\n`
	}
	outStr += `</svg></body></html>`

	return outStr
}

function main(callArgs = process.argv.slice(2)) {
	let targetArray = sites
	if (callArgs[0] == 'roomTest') targetArray = testRoom

	for (let site of targetArray) {
		try {
			V.addSite(new Point(site[0], site[1]))
		}
		catch(e) {
			console.log(e.stack || e)
		}
	}

	let VDraw = V.draw()
	fs.writeFile('src/Classes/newPlanner/index.html', draw([VDraw], callArgs[0] != 'roomTest'), s => s)
}

main()