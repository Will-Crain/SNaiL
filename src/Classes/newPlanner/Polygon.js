/**
 * Polygon class
 * @param {Array} nodes Takes an array of serialized RoomPositions
 * 
 * @returns {Object} A Polygon instance with defined and reduced edges
 */
class Polygon {
	constructor(id, nodes) {
		this.id = id
		this.nodes = _.uniq(nodes)
		this.edges = []
	}

	/**
	 * Mutates Polygon.edges to contain a reduced version of the edges
	 */
	makeEdges() {
		// Map string positions to position objects
		let nodes = this.nodes
		let positionMap = this.nodes.map(function(position) {
			return RoomPosition.parse(position)
		})

		// Get all edges
		let primitiveEdges = positionMap.filter(function(position) {
			let adjacent = position.getAdjacent({serialize: true})
			let outside = adjacent.some(function(adjPosition) {
				return !nodes.includes(adjPosition)
			})
			if (outside) {
				return true
			}

			return false
		})

		// If an edge has two neighbors and both neighbors form a straight line, discard that edge
		let reducedEdges = primitiveEdges.filter(function(position) {
			let adjacentEdges = primitiveEdges.filter(function(adjPosition) {
				if (adjPosition.getRangeTo(position) == 1) {
					return true
				}

				return false
			})
			if (adjacentEdges.length != 2) {
				return true
			}

			let mapping = adjacentEdges.map(function(adjPosition) {
				return position.getDirectionTo(adjPosition)
			})
			if (Math.abs(mapping[0] - mapping[1]) == 4) {
				return false
			}

			return true
		})

		// Store these in string form
		// reducedEdges = reducedEdges.map(function(position) {
		// 	return RoomPosition.serialize(position)
		// })

		this.edges = primitiveEdges.map(s => RoomPosition.serialize(s))
		return primitiveEdges.map(s => RoomPosition.serialize(s))

	}
	/**
	 * hasPosition
	 * @param {String} serializedPosition Takes a serialized RoomPosition to check
	 * @returns {Boolean} Whether or not this polygon contains serializedPosition
	 */
	hasPosition(serializedPosition) {
		return this.nodes.includes(serializedPosition)
	}
}

global.Polygon = Polygon