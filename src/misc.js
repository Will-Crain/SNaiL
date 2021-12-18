global.HSL_TO_RGB = function(h, s, l)  {
	let r, g, b
	if (s == 0) {
			r = g = b = l
	}
	else {
		function hue2rgb(p, q, t) {
					
			if (t < 0) t++
			if (t > 1) t--
			if (t < 1/6) return p + (q-p) * 6 * t
			if (t < 1/2) return q
			if (t < 2/3) return p + (q-p) * (2/3 - t) * 6
			return p
		}
			
			let q = l < 0.5 ? l * (1 + s) : l + s - l*s
			let p = 2 * l - q
			
			r = hue2rgb(p, q, h + 1/3)
			g = hue2rgb(p, q, h)
			b = hue2rgb(p, q, h - 1/3)
	}
	return [Math.round(r*255), Math.round(g * 255), Math.round(b * 255)]
}

global.RGB_TO_HEX = function(rgb) {
	let [r,g,b] = rgb
	r = r.toString(16)
	g = g.toString(16)
	b = b.toString(16)
	return '#' + r + g + b
}

global.HSL_TO_HEX = function(h, s, l) {
	let RGB = HSL_TO_RGB(h, s, l)
	let HEX = RGB_TO_HEX(RGB)
	return HEX
}

global.lerp = function(a, b, amt) {
	if (amt < 0) {
		amt = 0
	}
	else if (amt > 1) {
		amt = 1
	}
	
	return a + (b-a)*amt
}