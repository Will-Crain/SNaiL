const util = require('util')
const fs = require('fs')

// Order is Heat Wave -> Glaucous -> Dark Purple -> Brick Red -> Black
// const colors = ['#FD7F20', '#6082B6', '#230C33', '#C33C54', '#000000']
// Order is maroon -> navy -> yellow -> orange -> purple -> grey -> something -> black
// const colors = ['#800000', '#000075', '#F58231', '#FFE119', '#4363D8', '#A9A9A9', '#DCBEFF', '#000000']
const colors = ['#e60049', '#0bb4ff', '#50e991', '#e6d800', '#9b19f5', '#ffa300', '#dc0ab4', '#b3d4ff', '#00bfa0', '#000000']

let counter = 0

function makeID() {
	return `${Math.random().toString(36).slice(2, 9)}`.toUpperCase()
}
class Region {
	/**
	 * @param {Point} center The initial point for the region
	 * @param {Array.<Edge>} edges A list of edges that contain this region
	 * @returns {Region} A region described by center & edges
	 */
	constructor(center, edges=[]) {
		this.center = center
		this.edges = edges

		this.id = makeID()
		this.color = colors[counter++]

		return this
	}

	/**
	 * @name getstr Returns a string representing this object for SVG
	 * @returns {String} A string representation of the object
	 */
	getStr(opts) {
		let {drawOffset, scale=1} = opts
		let outStr = `${this.center.getStr({
			drawOffset: drawOffset, 
			scale: scale,
			color: this.color,
			opacity: 0.5
		})}\n`

		for (let edge of this.edges) {
			outStr += `${edge.getStr({
				drawOffset: drawOffset, 
				scale: scale,
				color: this.color,
				width: 2
			})}\n`
			// for (let point of edge.points) {
			// 	outStr += `${point.getStr({
			// 		drawOffset: drawOffset, 
			// 		scale: scale,
			// 		color: this.color,
			// 		opacity: 0.5
			// 	})}\n`
			// }
		}

		return outStr
	}
}
Region.directions = {'CW': 'CW', 'CCW': 'CCW'}

class Edge {
	/**
	 * @param {Point} points An array of points to give this edge
	 * @returns {Edge} An edge object
	 */
	constructor(points=[], isEdge=false) {
		this.points = points
		this.isEdge = isEdge

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
		let direction = new Point(this.points[1].x - this.points[0].x, this.points[1].y - this.points[0].y)
		return direction.normalize()
		// return this.points[1].copy().sub(this.points[0].copy()).normalize()
	}
	get length() {
		return Math.pow( Math.pow(this.x, 2) + Math.pow(this.y, 2), 2 )
	}

	/**
	 * @name bisector Generates a perpendicular bisector at a the midpoint of a line `edge`
	 * @param {Edge} edge The edge to consider
	 * @return {Edge} An edge bounded by its length being 100, congruent about the line it bisected
	 */
	bisector() {
		let perpDirection = this.direction.flip()

		let newP0 = this.midPoint.copy().add(perpDirection.copy().mul(10))
		let newP1 = this.midPoint.copy().add(perpDirection.copy().mul(-10))

		return new Edge([newP0, newP1])
	}

	/**
	 * @name closestPoint Calculates and returns the point in `this.points` closest to `point`
	 * @param {Point} point The point to consider
	 * @returns {Number} The index of the point closest to `point`
	 */
	closestPoint(point) {
		if (this.points[0].distanceTo(point) < this.points[1].distanceTo(point)) return 0
		return 1
	}
	furthestPoint(point) {
		if (this.points[0].distanceTo(point) > this.points[1].distanceTo(point)) return 0
		return 1
	}

	/**
	 * @returns {Boolean} Returns true if a point is to the right of `this`, false if left or collinear
	 */
	getSide(point) {
		let cross = ( (this.points[1].x - this.points[0].x)*(point.y - this.points[0].y) - (this.points[1].y - this.points[0].y)*(point.x - this.points[0].x) )
		return cross
	}

	/**
	 * @name intercept If it exists, returns a point of intersection between two edges. Otherwise, false
	 * @param {Edge} that The other edge to consider
	 * @returns {Point} A new point at the point of intersection, or an existing point if the intersection is coincedent with another point
	 */
	intercept(that) {
		// Thanks to this stack overflow answer by Dan Fox 
		// https://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function

		let thisDirection = this.points[1].copy().sub(this.points[0].copy())

		let [thatDx, thatDy] = [that.points[1].x - that.points[0].x, that.points[1].y - that.points[0].y]
		let [thisDx, thisDy] = [this.points[1].x - this.points[0].x, this.points[1].y - this.points[0].y]

		// Calculate the determinant super quick to see if an interception does exist (only 0 if not linearlly independent, which implies the lines are parallel)
		let determinant = thisDx*thatDy - thatDx*thisDy
		if (determinant == 0) {
			return {interception: null, type: 'parallel'}
		}
		// Lambda and Gamma are the constants for the paramaterization of `this` and `that`, respectively
		
		let lambda = ((that.points[1].y - that.points[0].y) * (that.points[1].x - this.points[0].x) + (that.points[0].x - that.points[1].x) * (that.points[1].y-this.points[0].y)) / determinant
		let gamma =  ((this.points[0].y - this.points[1].y) * (that.points[1].x - this.points[0].x) + (this.points[1].x - this.points[0].x) * (that.points[1].y-this.points[0].y)) / determinant

		// This intersection only exists if gamma is between 0 and 1. At 0, the point is `points[0]` and at 1, the point is `points[1]`.
		if (gamma > 1 || gamma < 0) {
			return {interception: null, type: 'parallel'}
		}

		// Are we coincedent anywhere?
		if (lambda == 0) return {interception: this.points[0], type: 'collinear'}
		else if (lambda == 1) return {interception: this.points[1], type: 'collinear'}
		else if (gamma == 0) return {interception: that.points[0], type: 'collinear'}
		else if (gamma == 1) return {interception: that.points[1], type: 'collinear'}

		// Doesn't matter which vector we use now
		return {interception: this.points[0].copy().add(thisDirection.mul(lambda)), type: 'acollinear'}
	}

	/**
	 * @name getStr Returns a string representing this object for SVG
	 * @returns {String} A string representation of the object
	 */
	getStr(opts) {
		let {drawOffset, color, scale=1, width=1} = opts
		let points = ''

		for (let point of this.points) {
			points += `${Math.round((point.x*scale+drawOffset.x)*100)/100},${Math.round( (point.y*scale+drawOffset.y)*100)/100} `
		}
		
		let outStr = `<polyline points='${points}' stroke='${color || 'black'}' opacity='0.5' fill='none' stroke-width='${width}'></polyline>`
		
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
		this.x = x
		this.y = y

		this.id = makeID()

		return this
	}
	/**
	 * @name sub Subtracts a point from this point. Mutates this, does not mutate that.
	 * @param {Point} that The point to be added
	 * @return {Point} Returns itself
	 */
	add(that) {
		this.x += that.x
		this.y += that.y

		return this
	}
	/**
	 * @name sub Subtracts a point from this point. Mutates this, does not mutate that.
	 * @param {Point} that The point to be subtracted
	 * @return {Point} Returns itself
	 */
	sub(that) {
		this.x -= that.x
		this.y -= that.y

		return this
	}
	/**
	 * @name multiply Multiplies each x and y by `that`. Mutates this.
	 * @param {Number} that The number to be multiplied
	 * @return {Point} Returns itself
	 */
	mul(that) {
		this.x *= that
		this.y *= that

		return this
	}

	nearestRegion(regions) {
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
	nearest(points) {
		let nearest, dist

		for (let point of points) {
			let distance = this.distanceTo(point)
			if (!dist || distance < dist) {
				dist = distance
				nearest = point
			}
		}

		return nearest
	}
	furthest(points) {
		let furthest, dist

		for (let point of points) {
			let distance = this.distanceTo(point)
			if (!dist || distance > dist) {
				dist = distance
				furthest = point
			}
		}

		return furthest
	}

	/**
	 * @param {Array} points An array of points to consider
	 */
	nearestPoint(points) {
		let nearest, dist

		for (let point of points) {
			let distance = this.distanceTo(point)
			if (!dist || distance < dist) {
				dist = distance
				nearest = region
			}
		}

		return nearest
	}

	distanceTo(that, metric='euclid') {
		if (metric == 'screeps') return Math.max(that.x - this.x, that.y - that.y)
		else if (metric == 'euclid') return Math.pow( Math.pow(this.x - that.x, 2) + Math.pow(this.y - that.y, 2), 0.5 )
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
	 * @name getStr Returns a string representing this object for SVG
	 * @returns {String} A string representation of the object
	 */
	getStr(opts) {
		let {color, drawOffset, scale=1, opacity=1} = opts
		let outStr = `<circle cx='${Math.round((this.x*scale+drawOffset.x)*100)/100}' cy='${Math.round((this.y*scale+drawOffset.y)*100)/100}' r='3' fill='${color || 'black'}' opacity='${opacity}'></circle>`

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