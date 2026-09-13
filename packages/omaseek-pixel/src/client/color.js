/**
 * The one color step both palette builders share.
 *
 * OmaSeek's registered themes expand 14 source colors into 29 tokens, and the
 * hero field steps its inks off the same two theme tokens; both need the same
 * blend, so it lives here rather than twice.
 */

/** The handful of CSS names a palette table might spell a color with. */
const NAMED = { silver: 'c0c0c0', white: 'ffffff', black: '000000', gray: '808080', grey: '808080' }

/** Parse a hex or one of those names into `[r, g, b]`. */
export function toRgb(value) {
  var raw = String(value === undefined || value === null ? '' : value).trim().toLowerCase()
  if (NAMED[raw] !== undefined) raw = NAMED[raw]
  var hex = raw.charAt(0) === '#' ? raw.slice(1) : raw
  if (hex.length === 3) hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2)
  if (hex.length !== 6) return [128, 128, 128]
  var n = parseInt(hex, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Blend two colors: `amount` of `to` over `from`, as `#rrggbb`.
 * Omarchy tints the user bubble with brand at 12.15 % over the app background;
 * the same math gives every derived surface a consistent step.
 */
export function mix(from, to, amount) {
  var a = toRgb(from), b = toRgb(to), out = '#'
  for (var i = 0; i < 3; i += 1) {
    var v = Math.round(a[i] + (b[i] - a[i]) * amount)
    var hex = v.toString(16)
    out += hex.length < 2 ? '0' + hex : hex
  }
  return out
}
