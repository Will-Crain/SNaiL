const util = require('util')
const fs = require('fs')

function makeID() {
	return `${Math.random().toString(36).slice(2, 9)}`.toUpperCase()
}
class Region {
	/**
	 * @param {Point} center The initial point for the region
	 * @param {Array.<Edge>} edges A list of edges that contain this region
	 * @returns {Region} A region described by center & edges
	 */
	constructor(center, edges) {
		this.center = center
		this.edges = edges

		this.id = makeID()

		return this
	}

	/**
	 * @name getEdgesWithPoint Returns an array of edges in this region that have a point `point`
	 * @param {Point} point The point to consider
	 */
	getEdgesWithPoint(refPoint) {
		let edges = []

		for (let edge of this.edges) {
			for (let point of edge.points) {
				if (point.id == refPoint.id) {
					edges.push(edge)
				}
			}
		}

		return edges
	}
	/**
	 * @name getstr Returns a string representing this object for SVG
	 * @returns {String} A string representation of the object
	 */
	getStr(drawOffset) {
		let outStr = `${this.center.getStr(drawOffset)}\n`

		for (let edge of this.edges) {
			outStr += `${edge.getStr(drawOffset)}\n`
		}

		return outStr
	}
}

class Edge {
	/**
	 * @param {Point} points An array of points to give this edge
	 * @returns {Edge} An edge object
	 */
	constructor(points=[]) {
		this.points = points

		this.id = makeID()

		return this
	}

	/**
	 * @name midPoint Returns a new point between this edge's two points
	 * @returns {Point} A point between the two points for this edge
	 */
	get midPoint() {
		let x = this.points[0].x + this.points[1].x
		let y = this.points[0].y + this.points[1].y

		return new Point(x/2, y/2)
	}
	/**
	 * @name direction Returns a normalized array pointing in the same direction as this edge
	 * @returns {Edge} A new edge with length 1 pointing in the same direction as this
	 */
	get direction() {
		return new Point(this.points[1].x - this.points[0].x, this.points[1].y - this.points[0].y).normalize()
		// return this.points[1].copy().sub(this.points[0].copy()).normalize()
	}
	get length() {
		return Math.pow( Math.pow(this.x, 2) + Math.pow(this.y, 2), 2 )
	}
	/**
	 * @name getBisector Generates a perpendicular bisector at a the midpoint of a line `edge`
	 * @param {Edge} edge The edge to consider
	 * @return {Edge} An edge bounded by its length being 100, congruent about the line it bisected
	 */
	getBisector() {
		let perpDirection = this.direction.flip()

		let newP0 = this.midPoint.copy().translate(perpDirection.copy().mul(10))
		let newP1 = this.midPoint.copy().translate(perpDirection.copy().mul(-10))

		return new Edge([newP0, newP1])
	}

	/**
	 * @name getClosestPoint Calculates and returns the point in `this.points` closest to `point`
	 * @param {Point} point The point to consider
	 * @returns {Number} The index of the point closest to `point`
	 */
	getClosestPoint(point) {
		if (this.points[0].distanceTo(point) < this.points[1].distanceTo(point)) {
			return 0
		}
		
		return 1
	}

	/**
	 * @name getIntercept If it exists, returns a point of intersection between two edges. Otherwise, false
	 * @param {Edge} that The other edge to consider
	 * @returns {Point} A new point at the point of intersection, or an existing point if the intersection is coincedent with another point
	 */
	getIntercept(that, midPoint) {
		// Thanks to this stack overflow answer by Dan Fox 
		// https://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function

		let thisDirection = this.points[1].copy().sub(this.points[0].copy())

		let [thatDx, thatDy] = [that.points[1].x - that.points[0].x, that.points[1].y - that.points[0].y]
		let [thisDx, thisDy] = [this.points[1].x - this.points[0].x, this.points[1].y - this.points[0].y]

		// Calculate the determinant super quick to see if an interception does exist (only 0 if not linearlly independent, which implies the lines are parallel)
		let determinant = thisDx*thatDy - thatDx*thisDy
		if (determinant == 0) {
			return false
		}

		// Check if midPoint is colinear with points in `that`
		let edgeChecker0 = new Edge([midPoint, that.points[0]])
		let edgeChecker1 = new Edge([midPoint, that.points[1]])

		let dir0 = midPoint.directionTo(that.points[0])
		let dir1 = midPoint.directionTo(that.points[1])

		let dot = (dir1.x * dir0.x) + (dir1.y * dir0.y)

		let diff = dir1.sub(dir0)
		if (dot < 1e-3) {
			console.log('Colinear!')
			let closestPoint = that.getClosestPoint(midPoint)
			return that.points[closestPoint]
		}
		// let crossProduct = (midPoint.y - that.points[0].y) * (that.points[1].x - that.points[0].x) - (midPoint.x - that.points[0].x) * (that.points[1].y - that.points[0].y)
		// if (Math.abs(crossProduct) == 0) {
		// 	console.log('Colinear!')
		// 	let closestPoint = that.getClosestPoint(midPoint)
		// 	return that.points[closestPoint]
		// }

		// Lambda and Gamma are the constants for the paramaterization of `this` and `that`, respectively
		
		let lambda = ((that.points[1].y - that.points[0].y) * (that.points[1].x - this.points[0].x) + (that.points[0].x - that.points[1].x) * (that.points[1].y-this.points[0].y)) / determinant
		let gamma =  ((this.points[0].y - this.points[1].y) * (that.points[1].x - this.points[0].x) + (this.points[1].x - this.points[0].x) * (that.points[1].y-this.points[0].y)) / determinant

		// This intersection only exists if gamma is between 0 and 1. At 0, the point is `points[0]` and at 1, the point is `points[1]`.
		if (gamma > 1 || gamma < 0) {
			return false
		}

		// Are we coincedent anywhere?
		if (lambda == 0) return this.points[0]
		else if (lambda == 1) return this.points[1]
		else if (gamma == 0) return that.points[0]
		else if (gamma == 1) return that.points[1]

		// Doesn't matter which vector we use now
		return this.points[0].copy().translate(thisDirection.mul(lambda))
	}

	/**
	 * @name getstr Returns a string representing this object for SVG
	 * @returns {String} A string representation of the object
	 */
	getStr(drawOffset, w=1, color) {
		let points = ''

		for (let point of this.points) {
			points += `${Math.round((point.x+drawOffset.x)*100)/100},${Math.round( (point.y+drawOffset.y)*100)/100} `
		}
		
		let outStr = `<polyline points="${points}" stroke="${color || 'black'}" fill="none" stroke-width="${w}"></polyline>`
		
		return outStr
	}
}

class Point {
	/**
	 * @param {Number} x The x coordinate of the point
	 * @param {Number} y The y coordinate of the point
	 * @returns {Point} A point at x and y
	 */
	constructor(x, y) {
		this.resolution = 1e3
		// We don't need a resolution any greater than 1/1000
		this.x = Math.round(x*this.resolution)/this.resolution
		this.y = Math.round(y*this.resolution)/this.resolution

		this.id = makeID()

		return this
	}
	/**
	 * @name sub Subtracts a point from this point. Mutates this, does not mutate that.
	 * @param {Point} that The point to be added
	 * @return {Point} Returns itself
	 */
	add(that) {
		this.x = Math.round( (this.x+that.x)*this.resolution)/this.resolution
		this.y = Math.round( (this.y+that.y)*this.resolution)/this.resolution

		return this
	}
	/**
	 * @name sub Subtracts a point from this point. Mutates this, does not mutate that.
	 * @param {Point} that The point to be subtracted
	 * @return {Point} Returns itself
	 */
	sub(that) {
		this.x = Math.round( (this.x-that.x)*this.resolution)/this.resolution
		this.y = Math.round( (this.y-that.y)*this.resolution)/this.resolution

		return this
	}
	/**
	 * @name multiply Multiplies each x and y by `that`. Mutates this.
	 * @param {Number} that The number to be multiplied
	 * @return {Point} Returns itself
	 */
	mul(that) {
		this.x = Math.round(this.x*that*this.resolution)/this.resolution
		this.y = Math.round(this.y*that*this.resolution)/this.resolution

		return this
	}

	getNearestRegion(regions) {
		let nearest, dist

		for (let region of regions) {
			let distance = this.distanceTo(region.center)
			if (!dist || distance < dist) {
				dist = distance
				nearest = region
			}
		}

		return nearest
	}

	distanceTo(that) {
		// return Math.max(that.x - this.x, that.y - that.y)
		return Math.pow( Math.pow(this.x - that.x, 2) + Math.pow(this.y - that.y, 2), 0.5 )
	}
	directionTo(that) {
		return new Point(that.x - this.x, that.y - this.y)
	}
	angleTo(that) {
		return Math.atan2(that.y - this.y, that.x - this.x)
	}

	/**
	 * @name flip Flips the x and y of this
	 * @returns {Point} The mutated flipped point
	 */
	 flip() {
		 return new Point(-this.y, this.x)
	}

	/**
	 * @name normalize Normalizes this point. Does not mutate, returns new point
	 * @returns {Point} A normalized point
	 */
	normalize() {
		let mag = Math.pow(Math.pow(this.x, 2) + Math.pow(this.y, 2), 0.5)

		return this.copy().mul(1/mag)
	}

	/**
	 * @name translate Translates this point by another point `by`
	 * @param {Point} by The vector to translate along
	 * @return {Point} Returns itself mutated by the translation
	 */
	translate(that) {
		this.x = Math.round( (this.x+that.x)*this.resolution)/this.resolution
		this.y = Math.round( (this.y+that.y)*this.resolution)/this.resolution

		return this
	}

	/**
	 * @name getstr Returns a string representing this object for SVG
	 * @returns {String} A string representation of the object
	 */
	getStr(drawOffset, color) {
		let outStr = `<circle cx="${Math.round((this.x+drawOffset.x)*100)/100}" cy="${Math.round((this.y+drawOffset.y)*100)/100}" r="3" fill="${color || 'black'}"opacity="0.75"></circle>`

		return outStr
	}

	/**
	 * @name copy Copies this point
	 * @return {Point} A copy of this point
	 */
	copy() {
		return new Point(this.x, this.y)
	}
}

global.Region = Region
global.Edge = Edge
global.Point = Point