const util = require('util')
const fs = require('fs')
const _ = require('lodash')
require('./Geometry')

// Order is maroon -> navy -> yellow -> orange -> purple -> grey -> something -> black
const colors = ['#800000', '#000075', '#FFE119', '#F58231', '#4363D8', '#A9A9A9', '#DCBEFF', '#000000']

function makeID() {
	return `${Math.random().toString(36).slice(2, 11)}`.toUpperCase()
}

class Voronoi {
	constructor(scope) {
		let {drawOffset=new Point(10, 10), scale=1} = scope

		this.drawOffset = drawOffset

		this.points = []
		this.edges = []
		this.regions = []

		this.bounds = [-1, 50]

		this.toDraw = []
		this.scale = scale

		return this
	}


	/**
	 * @name intersections
	 * @param {Point} site The site we're considering
	 * @param {Region} region The region we're considering
	 * @returns {Object} An object containing intersection information
	 */
	intersections(site, region) {
		let intersections = []

		// Generate `connector` and `bisector`
		let connector = new Edge([site, region.center])
		let bisector = connector.bisector()
		// this.toDraw.push(bisector.getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[10]}))

		for (let edge of region.edges) {
			// Get an intercept, or early continue if it doesn't exist
			let {interception, type} = bisector.intercept(edge, edge.midPoint)
			if (!interception) continue
			
			// this.toDraw.push(connector.getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[region.color], width: 0.5}))
			// this.toDraw.push(bisector.getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[region.color], width: 0.5}))

			let targetRegion = this.regions.find(function(targetRegion) {
				let edgeMap = targetRegion.edges.map(s => s.id)
				return edgeMap.includes(s => s == edge.id)
			})

			// Add intercept to hash
			let outObj = {
				point: interception,
				edge: edge,
				region: targetRegion
			}
			intersections.push(outObj)
		}

		// console.log(site)
		// console.log(region.center)
		// console.log(util.inspect(intersections, false, 10))
		// console.log('\n\n')
		return intersections
	}

	addSite(site) {
		this.toDraw = []
		if (this.regions.some(s => s.center.x == site.x && s.center.y == site.y)) return

		// Special case where this is the first site in the graph
		if (this.regions.length == 0) {
			// Initialize points at boundaries
			this.points = [
				new Point(this.bounds[0], this.bounds[0]),
				new Point(this.bounds[1], this.bounds[0]),
				new Point(this.bounds[1], this.bounds[1]),
				new Point(this.bounds[0], this.bounds[1])
			]
			this.edges = [ 
				new Edge([this.points[0], this.points[1]], true),
				new Edge([this.points[1], this.points[2]], true),
				new Edge([this.points[2], this.points[3]], true),
				new Edge([this.points[3], this.points[0]], true)
			]
			let region = new Region(site, [this.edges[0], this.edges[1], this.edges[2], this.edges[3]])
			this.regions = [region]

			return
		}

		// If this isn't the first site, continue as normal
		let newRegion = new Region(site)
		let closestRegion = site.nearestRegion(this.regions)

		let intersections = {}
		let visitedRegions = []
		let regionsToCheck = [closestRegion]

		while (regionsToCheck.length > 0) {
			let region = regionsToCheck.shift()

			let intercepts = this.intersections(site, region)
			if (!intercepts || !intercepts.length) continue
			intersections[region.id] = intercepts

			// Iterate through intercepts, check if we need to check more
			for (let intercept of intercepts) {
				if (!intercept.point) continue

				// Check if there's a region on the other side of our intercepted edge. If there isn't, add adjacent regions that have at least one lone edge
				// This is like the `intercept.region` is the "region at infinity" and it borders all regions that border this "region"
				// It is alternatively finding all the regions that have an edge with `edge.isEdge` and is adjacent to `targetRegion`
				if (!intercept.region) {
					let borderRegions = this.regions.filter(function(refRegion) {
						return refRegion.edges.some(edge => edge.isEdge)
					})

					let regionsHash = regionsToCheck.map(s => s.id)
					for (let refRegion of borderRegions) {
						if (!regionsHash.includes(refRegion.id) && !visitedRegions.includes(refRegion.id)) regionsToCheck.push(refRegion)
					}

					continue
				}

				// If there is a region, mark it to be checked
				if (!visitedRegions.includes(intercept.region.id)) {
					regionsToCheck.push(intercept.region)
				}
			}
			
			// Add this region to our checked regions list
			visitedRegions.push(region.id)
		}
	
		// Now we iterate through `intersections` and create new edges
		let visitedEdges = {}
		let newEdges = []

		for (let regionID in intersections) {
			let targetRegion = this.regions.find(s => s.id == regionID)
			let newEdge = new Edge()

			// Split the existing edge on `intercept.point`
			for (let intercept of intersections[regionID]) {
				if (visitedEdges[intercept.edge.id]) {
					newEdge.points.push(visitedEdges[intercept.edge.id])
					continue
				}

				let separate = intercept.edge.furthestPoint(targetRegion.center)
				let splitEdge = new Edge([intercept.edge.points[separate], intercept.point], intercept.edge.isEdge)

				// Only give `targetRegion` `splitEdge` if it's a bounding edge
				if (splitEdge.isEdge) targetRegion.edges.push(splitEdge)
				// if (splitEdge.isEdge || intersections[regionID].length == 0) targetRegion.edges.push(splitEdge)
				targetRegion.edges.push(splitEdge)
				this.toDraw.push(splitEdge.getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[colors[10]], width: 0.5}))

				intercept.edge.points[separate] = intercept.point
				newEdge.points.push(intercept.point)

				if (!intercept || !intercept.edge) continue

				// Mark this edge as seen
				visitedEdges[intercept.edge.id] = intercept.point
			}
			this.toDraw.push(newEdge.getStr({drawOffset: this.drawOffset, scale: this.scale, color: 'red', width: 0.5}))

			// Format `newEdge` such that newEdges.points[0] is on the right side of the connector
			let connector = new Edge([newRegion.center, targetRegion.center])
			if (connector.getSide(newEdge.points[0]) > 0) {
				let placeholder = newEdge.points[0]
				newEdge.points[0] = newEdge.points[1]
				newEdge.points[1] = placeholder
			}
			newEdges.push(newEdge)

			// Populate `filterEdges` with edges with at least 1 point on the right side of `newEdge`
			let filterEdges = []
			for (let edge of targetRegion.edges) {
				for (let point of edge.points) {

					// Is this point on the right side of the bisector?
					if (newEdge.getSide(point) > 0) {
						if (newEdges.some(s => s.id == edge.id)) continue

						newEdges.push(edge)
						filterEdges.push(edge.id)
						// this.toDraw.push(edge.getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[7]}))
					}
				}
			}

			targetRegion.edges = targetRegion.edges.filter(s => !filterEdges.includes(s.id))
			
			// One last pass to get rid of bad edges (only happens in the case of bisecting only `isEdge` edges)
			let newMap = newEdges.map(s => s.id)
			targetRegion.edges = targetRegion.edges.filter(function(edge) {
				if (newMap.includes(edge.id)) {
					newEdges.splice(newEdges.findIndex(s => s.id == edge.id), 1)
					return false
				}
				return true
			})
			targetRegion.edges.push(newEdge)
		}

		// and now we wrap things up
		newRegion.edges = newEdges
		this.regions.push(newRegion)
	}

	adjacentRegions(refRegion) {
		let adjacentRegions = []
		let idMap = []

		let refEdgeList = refRegion.edges.map(s => s.id)

		for (let region of this.regions) {
			if (region.id == refRegion.id) continue

			for (let edge of region.edges) {
				if (refEdgeList.includes(edge.id) && !idMap.includes(region.id)) {
					adjacentRegions.push(region)
					idMap.push(region.id)
				}
			}
		}

		return adjacentRegions
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

	for (let i = 0; i <= n; i++) {
		let x, y
		while ( (!x || !y) || (sites.some(s => s.x == x && s.y == y))) {
			x = 1+Math.floor(Math.random()*49)
			y = 1+Math.floor(Math.random()*49)
		}
		sites.push([x, y])
	}
	
	return sites
}

let sites = [
	[10, 10], [20, 10], [15, 10], [25, 25], [20, 30]
]
// let sites = randomPoints(8)
for (let site of sites) {
	try {
		V.addSite(new Point(site[0], site[1]))
	}
	catch(e) {
		console.log(e)
	}
}

// V.addSite(new Point(30, 10))
let VDraw = V.draw()

// Meta stuff used for drawing
function draw(diagramDraw) {
	let outStr = `<html><body><svg width="220" height="220">\n`

	for (let str of diagramDraw) {
		outStr += `${str}\n\n`
	}
	outStr += `</svg></body></html>`

	return outStr
}
// fs.writeFile('src/Classes/Planner/test.html', draw([VDraw]), s => console.log(util.inspect(V, false, 15)))
fs.writeFile('src/Classes/Planner/test.html', draw([VDraw]), s => s)