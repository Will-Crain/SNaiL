global.lerp = function(a, b, amt) {
	if (amt < 0) {
		amt = 0
	}
	else if (amt > 1) {
		amt = 1
	}
	
	return a + (b-a)*amt
}