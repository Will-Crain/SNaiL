global.DIRECTIONS = {
	1: {
		 1: [ 0, -1],
		 2: [ 1, -1],
		 3: [ 1,  0],
		 4: [ 1,  1],
		 5: [ 0,  1],
		 6: [-1,  1],
		 7: [-1,  0],
		 8: [-1, -1]
	},
	2: {
		 1: [ 0, -2],
		 2: [ 1, -2],
		 3: [ 2, -2],
		 4: [ 2, -1],
		 6: [ 2,  1],
		 7: [ 2,  2],
		 5: [ 2,  0],
		 8: [ 1,  2],
		 9: [ 0,  2],
		10: [-1,  2],
		11: [-2,  2],
		12: [-2,  1],
		13: [-2,  0],
		14: [-2, -1],
		15: [-2, -2],
		16: [-1, -2]
	},
	3: {
		 1: [ 0, -3],
		 2: [ 1, -3],
		 3: [ 2, -3],
		 4: [ 3, -3],
		 5: [ 3, -2],
		 6: [ 3, -1],
		 7: [ 3,  0],
		 8: [ 3,  1],
		 9: [ 3,  2],
		10: [ 3,  3],
		11: [ 2,  3],
		12: [ 1,  3],
		13: [ 0,  3],
		14: [-1,  3],
		15: [-2,  3],
		16: [-3,  3],
		17: [-3,  2],
		18: [-3,  1],
		19: [-3,  0],
		20: [-3, -1],
		21: [-3, -2],
		22: [-3, -3],
		23: [-2, -3],
		24: [-1, -3]
	}
}

global.MAX_STACK_LENGTH = 100

global.BODY_ORDER = [TOUGH, MOVE, CARRY, WORK, RANGED_ATTACK, ATTACK, CLAIM, HEAL]

global.makeID = function() {
	return `${Math.random().toString(36).slice(2, 11)}`
}
global.TASKS = {}