class CreepBody extends Array {
	constructor(args) {
		super(...args)

		this.map = {}
		this.invalid = false
	}
	push(part) {
		if (this.length >= MAX_CREEP_SIZE) {
			this.invalid = true
		}

		if (_.has(this.map, part)) {
			this.map[part] += 1
		}
		else {
			this.map[part] = 1
		}

		return super.push(part)
	}
	set(part, count) {
		for (i = 0; i < count; i++) {
			this.push(part)
		}

		return this
	}
	get(part) {
		return this.map[part] || 0
	}


	cost() {
		return _.sum(this, s => BODYPART_COST[s])
	}
	sort() {
		return _.sortBy(this, s => BODY_ORDER[s])
	}
}