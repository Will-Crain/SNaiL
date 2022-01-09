const util = require('util')
const fs = require('fs')
require('./Geometry')

// Order is maroon -> navy -> yellow -> orange -> purple -> grey -> something -> black
const colors = ['#800000', '#000075', '#f58231', '#ffe119', '#4363d8', '#a9a9a9', '#dcbeff', '#000000']

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

		for (let edge of region.edges) {

			// Get an intercept, or early continue if it doesn't exist
			let interception = bisector.intercept(edge, edge.midPoint)
			if (!interception) continue
			
			// this.toDraw.push(connector.getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[0]}))
			// this.toDraw.push(bisector.getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[1]}))
			// this.toDraw.push(region.center.getStr({drawOffset: this.drawOffset, scale: this.scale, color: colors[2]}))

			let targetRegion = this.regions.find(function(targetRegion) {
				targetRegion.edges.find(function(targetEdge) {
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

		// console.log(util.inspect(intersections, false, 7) + '\n\n\n\n')
	
		// Now we iterate through `intersections` and create edges
		let visitedEdges = {}
		let newEdges = []

		for (let regionID in intersections) {
			let targetRegion = this.regions.find(s => s.id == regionID)
			let newEdge = new Edge()

			let checkNode
			let endNode

			// Split the existing edge on `intercept.point`
			for (let intercept of intersections[regionID]) {
				if (visitedEdges[intercept.edge.id]) {
					newEdge.points.push(visitedEdges[intercept.edge.id])
					continue
				}

				let separate = intercept.edge.furthestPoint(targetRegion.center)

				let splitEdge = new Edge([intercept.edge.points[separate], intercept.point])
				intercept.edge.points[separate] = intercept.point
				
				targetRegion.edges.push(splitEdge)
				newEdge.points.push(intercept.point)

				if (!intercept || !intercept.edge) continue
				if (!checkNode) {
					checkNode = {
						edge: intercept.edge,
						point: intercept.point
					}
				}
				else {
					endNode = intercept.point
				}

				// Mark this edge as seen
				visitedEdges[intercept.edge.id] = intercept.point
			}

			// Start our donation search
			let donated = []
			let visited = []
			let toVisit = [checkNode]

			while (toVisit.length > 0) {
				let thisNode = toVisit.shift()

				let nextEdge = targetRegion.nextEdge(thisNode.edge, thisNode.point)
				let nextPoint = nextEdge.points.find(s => s.id != thisNode.point.id)
				// console.log(nextEdge, nextPoint)

				if (visited.includes(nextEdge.id) || newEdge.points.map(s => s.id).includes(nextPoint.id)) continue
				donated.push(nextEdge)

				let newNode = {
					edge: nextEdge,
					point: nextPoint
				}
				toVisit.push(newNode)
			}

			targetRegion.edges = targetRegion.edges.filter(edge => !donated.map(s => s.id).includes(edge.id))
			newEdges.push(...donated)

			targetRegion.edges.push(newEdge)
			newEdges.push(newEdge)
		}
		
		// Prune `newRegion` of any redundant edges
		// ...

		// and now we wrap things up
		
		newEdges = newEdges.filter(s => s.isEdge)
		newRegion.edges = newEdges
		this.regions.push(newRegion)
	}
	draw() {
		let outStr = ''

		let points = `${this.drawOffset.x},${this.drawOffset.y} ${this.drawOffset.x},${this.drawOffset.y+49*this.scale} ${this.drawOffset.x+49*this.scale},${this.drawOffset.y+49*this.scale} ${this.drawOffset.x+49*this.scale},${this.drawOffset.y}`
		outStr += `<polygon points="${points}" fill="none" stroke="grey" stroke-width="${this.scale || 1}"></polygon>\n`

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

V.addSite(new Point(15, 10))
V.addSite(new Point(30, 30))
V.addSite(new Point(15, 20))
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
// fs.writeFile('src/Classes/Planner/test.html', draw([VDraw]), s => console.log(util.inspect(V, false, 10)))
fs.writeFile('src/Classes/Planner/test.html', draw([VDraw]), s => s)