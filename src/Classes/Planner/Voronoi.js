const util = require('util')
const fs = require('fs')
require('./Geometry')

// Order is maroon -> navy -> yellow -> orange -> purple -> grey -> something -> black
const colors = ['#800000', '#000075', '#F58231', '#FFE119', '#4363D8', '#A9A9A9', '#DCBEFF', '#000000']

function makeID() {
	return `${Math.random().toString(36).slice(2, 11)}`.toUpperCase()
}

class Voronoi {
	constructor(scope) {
		let {drawOffset=new Point(100, 100), scale=1} = scope

		this.drawOffset = drawOffset

		this.points = []
		this.edges = []
		this.regions = []

		this.bounds = [0, 49]

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
			// Is the midpoint on this edge?

			// Get an intercept, or early continue if it doesn't exist
			let {interception, type} = bisector.intercept(edge, edge.midPoint)
			if (!interception) continue
			
			// this.toDraw.push(connector.getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[0]}))
			// this.toDraw.push(bisector.getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[1]}))
			// this.toDraw.push(region.center.getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[2]}))

			let targetRegion = this.regions.find(function(targetRegion) {
				return targetRegion.edges.find(function(targetEdge) {
					return targetEdge.id == edge.id
				})
			})

			// Add intercept to hash
			intersections.push({
				point: interception,
				edge: edge,
				region: targetRegion
			})
		}

		return intersections
	}

	addSite(site) {
		this.toDraw = []

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

		let newRegion = new Region(site)

		// If this isn't the first site, continue as normal
		let closestRegion = site.nearestRegion(this.regions)

		let intersections = {}

		let visitedRegions = []
		let regionsToCheck = [closestRegion]

		while (regionsToCheck.length > 0) {
			let region = regionsToCheck.shift()

			let intercepts = this.intersections(site, region)
			intersections[region.id] = intercepts

			// Iterate through intercepts, check if we need to check more
			for (let intercept of intercepts) {

				// Check if there's a region on the other side of our intercepted edge
				if (!intercept.region) continue

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

				intercept.edge.points[separate] = intercept.point
				newEdge.points.push(intercept.point)

				if (!intercept || !intercept.edge) continue

				// Mark this edge as seen
				visitedEdges[intercept.edge.id] = intercept.point
			}

			// Format `newEdge` such that newEdges.points[0] is on the right side of the connector
			let connector = new Edge([newRegion.center, targetRegion.center])
			if (connector.getSide(newEdge.points[0]) > 0) {
				let placeholder = newEdge.points[0]
				newEdge.points[0] = newEdge.points[1]
				newEdge.points[1] = placeholder
			}
			newEdges.push(newEdge)
			// this.toDraw.push(newRegion.center.getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[10]}))
			// this.toDraw.push(targetRegion.center.getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[6]}))

			this.toDraw.push(newEdge.points[0].getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[10]}))
			this.toDraw.push(newEdge.points[1].getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[6]}))

			// Find the point on the bisector to the right of the line connecting the two regions
			let filterEdges = []
			for (let edge of targetRegion.edges) {
				for (let point of edge.points) {
					if (newEdge.getSide(point) > 0) {
						let edgeMap = newEdges.map(s => s.id)
						if (edgeMap.includes(edge.id)) continue

						newEdges.push(edge)
						filterEdges.push(edge.id)
						// this.toDraw.push(edge.getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[7]}))
					}
				}
			}
			targetRegion.edges = targetRegion.edges.filter(s => !filterEdges.includes(s.id))
			// filterEdges.forEach(edgeID => targetRegion.edges.splice(targetRegion.edges.findIndex(s => s.id == edgeID)))
			targetRegion.edges.push(newEdge)
		}

		// and now we wrap things up
		newRegion.edges = newEdges
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

// V.addSite(new Point(10, 7))
// V.addSite(new Point(15, 10))
// V.addSite(new Point(14, 20))

V.addSite(new Point(10, 10))
V.addSite(new Point(15, 10))
V.addSite(new Point(15, 16))
V.addSite(new Point(23, 15))

// V.addSite(new Point(30, 10))
let VDraw = V.draw()

// Meta stuff used for drawing
function draw(diagramDraw) {
	let outStr = `<html><body><svg width="2000" height="4000">\n`

	for (let str of diagramDraw) {
		outStr += `${str}\n\n`
	}
	outStr += `</svg></body></html>`

	return outStr
}
fs.writeFile('src/Classes/Planner/test.html', draw([VDraw]), s => console.log(util.inspect(V, false, 15)))
// fs.writeFile('src/Classes/Planner/test.html', draw([VDraw]), s => s)