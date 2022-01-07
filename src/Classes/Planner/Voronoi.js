const util = require('util')
const fs = require('fs')
require('./Geometry')

// Order is maroon -> navy -> yellow -> orange -> purple -> grey -> something -> black
const colors = ['#800000', '#000075', '#f58231', '#ffe119', '#4363d8', '#a9a9a9', '#dcbeff', '#000000']

function makeID() {
	return `${Math.random().toString(36).slice(2, 11)}`.toUpperCase()
}

class Voronoi {
	constructor(drawOffset=new Point(0, 0)) {
		this.drawOffset = drawOffset

		this.edgeMap = {}
		this.pointMap = {}

		this.regions = []

		this.toDraw = []

		this.init()
		return this

	}
	/**
	 * @name init Initializes the diagram with 4 regions
	 */
	init() {
		let regionPoints = [new Point(-50, -50), new Point(-50, 100), new Point(100, -50), new Point(100, 100)]
		let points = [
			new Point(24.5, 24.5),
	
			new Point(-100.5, 24.5),
			new Point( 148.5, 24.5),
	
			new Point(24.5, -100.5),
			new Point(24.5,  148.5)
	
		]
		let edges = [ 
			new Edge([points[0], points[1]]),
			new Edge([points[1], points[3]]),
			new Edge([points[3], points[0]]),
			new Edge([points[1], points[4]]),
			new Edge([points[4], points[0]]),
	
			new Edge([points[0], points[2]]),
			new Edge([points[2], points[3]]),
			new Edge([points[2], points[4]])
		]
	
		let regions = [
			new Region(regionPoints[0], [edges[0], edges[1], edges[2]]),
			new Region(regionPoints[1], [edges[0], edges[3], edges[4]]),
			new Region(regionPoints[2], [edges[5], edges[6], edges[2]]),
			new Region(regionPoints[3], [edges[5], edges[7], edges[4]])
		]

		this.regions = regions

		// Now that everything is initialized, link it
		this.updateMaps()
	}
	testInit0() {
		let points = [
			new Point(0, 0),
			new Point(49, 0),
			new Point(49, 49),
			new Point(0, 49)
		]
		let edges = [ 
			new Edge([points[0], points[1]]),
			new Edge([points[1], points[2]]),
			new Edge([points[2], points[3]]),
			new Edge([points[3], points[0]])
		]
		let region = new Region(new Point(0, 0), [edges[0], edges[1], edges[2], edges[3]])
		this.regions = [region]

		// Now that everything is initialized, link it
		this.updateMaps()

	}
	testInit1() {
		this.DCEL = {
			regions:	[],
			vertices:	[],
			edges:		[]
		}

		this.DCEL.regions =		[
			new Point(24.5, -100), new Point(150, 24.5), new Point(24.5, 150), new Point(-100, 24.5)
		]
		this.DCEL.vertices =	[

		]
		this.DCEL.edges = 		[
			
		]
		for (let region of newRegions) {
			this.DCEL.regions.push({
				point: region
			})
		}

		
	}
	testInit2() {
		let regionPoints = [new Point(0, 0), new Point(0, 49), new Point(49, 49), new Point(49, 0)]
		let points = [
			new Point(24.5, 24.5),
	
			new Point( 0, 24.5),
			new Point(49, 24.5),
	
			new Point(24.5,  0),
			new Point(24.5,  49)
	
		]
		let edges = [ 
			new Edge([points[0], points[1]]),
			new Edge([points[1], points[3]]),
			new Edge([points[3], points[0]]),
			new Edge([points[1], points[4]]),
			new Edge([points[4], points[0]]),
	
			new Edge([points[0], points[2]]),
			new Edge([points[2], points[3]]),
			new Edge([points[2], points[4]])
		]
	
		let regions = [
			new Region(regionPoints[0], [edges[0], edges[1], edges[2]]),
			new Region(regionPoints[1], [edges[0], edges[3], edges[4]]),
			new Region(regionPoints[2], [edges[5], edges[6], edges[2]]),
			new Region(regionPoints[3], [edges[5], edges[7], edges[4]])
		]

		this.regions = regions

		// Now that everything is initialized, link it
		this.updateMaps()
	}

	updateMaps() {
		this.edgeMap = {}
		this.pointMap = {}

		for (let region of this.regions) {
			for (let edge of region.edges) {
				if (!this.edgeMap[edge.id]) this.edgeMap[edge.id] = []
				if (!this.edgeMap[edge.id].includes(region.id)) this.edgeMap[edge.id].push(region.id)

				for (let point of edge.points) {
					if (!this.pointMap[point.id]) this.pointMap[point.id] = []
					if (!this.pointMap[point.id].includes(point.id)) this.pointMap[point.id].push(point.id)
				}
			}
		}
	}

	addSite(site) {
		this.toDraw = []

		let closestRegion = site.getNearestRegion(this.regions)
		
		// this.toDraw.push(site.getStr(this.drawOffset, 'black'))

		let bisectors = {}
		
		let visitedRegions = []
		let regionsToCheck = [closestRegion]
		
		while (regionsToCheck.length > 0) {
			let region = regionsToCheck.shift()
			if (visitedRegions.includes(region.id)) continue
			
			// Generate `connector` and `bisector`
			let connector = new Edge([site, region.center])
			let bisector = connector.getBisector()

			// Some drawing
			let color = colors[visitedRegions.length]
			this.toDraw.push(connector.getStr(this.drawOffset, 1, color))
			this.toDraw.push(bisector.getStr(this.drawOffset, 3, color))
			this.toDraw.push(region.center.getStr(this.drawOffset, color))
			
			// Find the edges the bisector intersects in this region
			for (let edge of region.edges) {
				
				// Get our intercept, or early continue
				let interception = bisector.getIntercept(edge, edge.midPoint)
				if (!interception) continue

				// this.toDraw.push(interception.getStr(color))

				// Add this region's intercepts to the hash
				if (!bisectors[region.id]) bisectors[region.id] = []
				bisectors[region.id].push({
					point: interception, 
					edge: edge
				})

				// Add this region to our visited region hash
				if (!visitedRegions.includes(region.id)) visitedRegions.push(region.id)

				let otherRegionID = this.edgeMap[edge.id].find(rId => rId != region.id)
				let otherRegion = this.regions.find(s => s.id == otherRegionID)
				if (!otherRegion || !otherRegionID) continue

				// Have we already visited the region where this edge leads?
				if (!visitedRegions.includes(otherRegionID) && !regionsToCheck.includes(otherRegionID)) {
					regionsToCheck.push(otherRegion)
				}
			}
		}
	
		// Now iterate through `bisectors` and create new edges and mutate existing edges
		let visitedEdges = {}
		let newEdges = []

		for (let regionID in bisectors) {
			let newEdge = new Edge()

			for (let intercept of bisectors[regionID]) {
				
				// Have we seen this edge already?
				if (visitedEdges[intercept.edge.id]) {
					// Assign an existing interception point to the new edge
					newEdge.points.push(visitedEdges[intercept.edge.id])
					continue
				}
				
				// Assign the interception point to the new edge
				newEdge.points.push(intercept.point)
				visitedEdges[intercept.edge.id] = intercept.point

				let targetPoint = intercept.edge.getClosestPoint(site)
				if (this.edgeMap[targetPoint.id]) delete this.edgeMap[targetPoint.id]
				intercept.edge.points[targetPoint] = intercept.point
			}
			
			let targetRegion = this.regions.find(region => region.id == regionID)
			let [theta0, theta1] = [
				site.angleTo(newEdge.points[0]), 
				site.angleTo(newEdge.points[1])
			]
			let thetaMax = Math.max(theta0, theta1)
			let thetaMin = Math.min(theta0, theta1)


			// Now remove any invalid points and edge
			let oldLength = targetRegion.edges.length
			targetRegion.edges = targetRegion.edges.filter(function(edge) {
				return edge.points.some(function(point) {
					let newTheta = site.angleTo(point)
					let checker = (newTheta >= thetaMax || newTheta <= thetaMin)
					// if (checker) console.log(util.inspect(edge, false, 5))

					return checker
				})
			})
			let newLength = targetRegion.edges.length
			console.log(`${oldLength}\t${newLength}`)
			targetRegion.edges.push(newEdge)
			newEdges.push(newEdge)
		}

		let newRegion = new Region(site, newEdges)
		for (let edge of newRegion.edges) {
			for (let point of edge.points) {
				// this.toDraw.push(point.getStr(this.drawOffset))
			}
		}
		
		this.regions.push(newRegion)
		this.updateMaps()
	}
	draw() {
		let outStr = ''

		let points = `${this.drawOffset.x},${this.drawOffset.y} ${this.drawOffset.x},${this.drawOffset.y+49} ${this.drawOffset.x+49},${this.drawOffset.y+49} ${this.drawOffset.x+49},${this.drawOffset.y}`
		outStr += `<polygon points="${points}" fill="none" stroke="grey" stroke-width="1"></polygon>\n`

		for (let region of this.regions) {
			outStr += `${region.getStr(this.drawOffset)}\n`
		}

		for (let str of this.toDraw) {
			outStr += `${str}\n`
		}

		return outStr
	}
}

let V = new Voronoi(new Point(400, 100))
let V2 = new Voronoi(new Point(150, 100))

V.addSite(new Point(5, 10))
V.addSite(new Point(5, 39))

V2.addSite(new Point(5, 10))
// V2.addSite(new Point(5, 39))
// V2.addSite(new Point(43, 4))
// V.addSite(new Point(24, 10))
// V.addSite(new Point(41, 5))
// V.addSite(new Point(41, 5))

let VDraw = V.draw()
let V2Draw = V2.draw()


function draw(diagramDraw) {
	let outStr = `<html><body><svg width="2000" height="4000">\n`

	for (let str of diagramDraw) {
		outStr += `${str}\n\n`
	}
	outStr += `</svg></body></html>`

	return outStr
}
fs.writeFile('src/Classes/Planner/test.html', draw([VDraw, V2Draw]), s => s)//console.log(util.inspect(V, false, 10)))