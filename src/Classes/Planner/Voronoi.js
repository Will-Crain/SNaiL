class Region {
	/**
	 * @param {Point} center The initial point for the region
	 * @param {Array.<Edge>} edges A list of edges that contain this region
	 * @returns {Region} A region described by center & edges
	 */
	constructor(center, edges) {
		this.center = center
		this.edges = edges

		return this
	}
}

class Edge {
	/**
	 * @param {Point} start The starting point
	 * @param {Point} end The starting point
	 * @returns {Edge} An edge connecting start to end
	 */
	constructor(start, end, region) {
		this.start = start
		this.end = end

		return this
	}
	/**
	 * @name midPoint Returns a midpoint without a parent
	 * @returns {Point} A point between this.end and this.start
	 */
	get midpoint() {
		let x = this.start.x + this.end.x
		let y = this.start.y + this.end.y

		return new Point(x/2, y/2)
	}
	/**
	 * @name slope Returns the slope of this edge, from start to end
	 * @returns {Number} A number describing the slope
	 */
	get slope() {
		let dx = this.end.x - this.start.x
		let dy = this.end.y - this.start.y

		return dy/dx
	}
	/**
	 * @name generateBisector Generates a perpendicular bisector at a the midpoint of a line `edge`
	 * @param {Edge} edge The edge to consider
	 * @return {Edge} An edge bounded by its length being 100, congruent about the line it bisected
	 */
	generateBisector() {
		let direction = this.end.copy().sub(this.start)
		let perpDirection = direction.copy().flip()

		let newStart = this.midPoint.copy().translate(perpDirection.mul(50))
		let newEnd = this.midPoint.copy().translate(perpDirection.mul(-50))

		return new Edge(newStart, newEnd)
	}
}
global.Edge = Edge

class Point {
	/**
	 * @param {Number} x The x coordinate of the point
	 * @param {Number} y The y coordinate of the point
	 * @returns {Point} A point at x and y
	 */
	constructor(x, y, parent) {
		this.x = x
		this.y = y

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

	/**
	 * @name flip Flips the x and y of this
	 * @returns {Point} The mutated flipped point
	 */
	 flip() {
		let t = this.y
		this.x = -this.y
		this.y = t

		return this
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
	translate(by) {
		this.x += by.x
		this.y += by.y

		return this
	}

	/**
	 * @name copy Copies this point
	 * @return {Point} A copy of this point
	 */
	copy() {
		return new Point(this.x, this.y)
	}
}
global.Point = Point