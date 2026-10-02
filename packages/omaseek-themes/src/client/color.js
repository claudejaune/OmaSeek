/**
 * The color arithmetic both palette builders share.
 *
 * OmaThemes' registered themes expand 15 source colors into 32 tokens, and the
 * hero field steps its inks off the same two theme tokens; both need the same
 * blend, so it lives here rather than twice. So does the one piece of arithmetic
 * that decides whether a palette is *usable* rather than merely faithful —
 * {@link distinctError}.
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

/**
 * WCAG relative luminance — how bright a color actually reads, which is not the
 * same as how bright its channels are. Green carries most of it and red least,
 * and that asymmetry is the whole reason {@link distinctError} cannot simply
 * keep a color's lightness when it changes its hue.
 * @param value - a hex color.
 * @returns luminance in 0..1.
 */
export function luminance(value) {
  var rgb = toRgb(value)
  var weights = [0.2126, 0.7152, 0.0722]
  var out = 0
  for (var i = 0; i < 3; i += 1) {
    var channel = rgb[i] / 255
    out += weights[i] * (channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4))
  }
  return out
}

/**
 * WCAG contrast ratio between two colors, 1 (identical) to 21 (black on white).
 * @returns the ratio.
 */
export function contrast(a, b) {
  var one = luminance(a)
  var two = luminance(b)
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05)
}

/** How far apart two hues have to be before they read as different colors. */
var DISTINCT_HUE = 30

/** The contrast two colors need before brightness alone tells them apart. */
var DISTINCT_CONTRAST = 3

/** The hue an unusable error color is turned to: red, and nothing else. */
var RED = 0

/** Chroma floor for that red, so a theme with no chroma at all still gets one. */
var RED_SATURATION = 0.7

/**
 * How bright the red is allowed to stay dark, as relative luminance.
 *
 * Keeping the error's own brightness is the point of the solve, but a theme
 * whose error is nearly black hands over a red that is nearly black too — the
 * White theme's `#2a2a2a` became `#4d1717`, and on white both counts of the
 * changed-files card still read as black. A red has to be bright enough to show
 * that it is red at all; below this it is lifted to here, which costs some of
 * the theme's own contrast (White keeps 8.1:1 against its background, down from
 * 14.5:1) and buys a colour a reader can actually name.
 */
var RED_FLOOR = 0.08

/**
 * How much chroma a color needs before its hue says anything. A neutral grey
 * reports the same hue as a pure red — zero saturation makes the number
 * meaningless — which is why this is asked before any hue is compared.
 */
var CHROMATIC = 0.25

/** How finely the red's lightness is searched for the error's own brightness. */
var RED_STEPS = 100

/** Hue, saturation and value, on the usual scales: degrees, 0..1, 0..1. */
function toHsv(value) {
  var rgb = toRgb(value)
  var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255
  var max = Math.max(r, g, b)
  var min = Math.min(r, g, b)
  var span = max - min
  var hue = 0
  if (span > 0) {
    if (max === r) hue = 60 * (((g - b) / span) % 6)
    else if (max === g) hue = 60 * ((b - r) / span + 2)
    else hue = 60 * ((r - g) / span + 4)
  }
  if (hue < 0) hue += 360
  return { hue: hue, saturation: max === 0 ? 0 : span / max, value: max }
}

/** The inverse, as `#rrggbb`. */
function fromHsv(hue, saturation, value) {
  var chroma = value * saturation
  var sector = hue / 60
  var second = chroma * (1 - Math.abs((sector % 2) - 1))
  var rgb = [0, 0, 0]
  if (sector < 1) rgb = [chroma, second, 0]
  else if (sector < 2) rgb = [second, chroma, 0]
  else if (sector < 3) rgb = [0, chroma, second]
  else if (sector < 4) rgb = [0, second, chroma]
  else if (sector < 5) rgb = [second, 0, chroma]
  else rgb = [chroma, 0, second]
  var base = value - chroma
  var out = '#'
  for (var i = 0; i < 3; i += 1) {
    var byte = Math.round((rgb[i] + base) * 255)
    if (byte < 0) byte = 0
    if (byte > 255) byte = 255
    var hex = byte.toString(16)
    out += hex.length < 2 ? '0' + hex : hex
  }
  return out
}

/** The shorter way round the color wheel between two hues, in degrees. */
function hueGap(one, two) {
  var gap = Math.abs(toHsv(one).hue - toHsv(two).hue)
  return Math.min(gap, 360 - gap)
}

/**
 * An error color a reader cannot mistake for the success color.
 *
 * The shell paints added against removed, and success against failure, with the
 * one pair `--dsw-alias-state-success-primary` / `--dsw-alias-state-error-primary`
 * — in the changed-files card, the presented-files card, the file rows inside a
 * tool call, the diff markers and the trajectory's prompt diff. Both come from
 * the theme, and a monochrome theme can hand over a "red" that is the same green
 * as its success: Hackerman's are `#50f872` and `#4fe88f`, thirteen degrees
 * apart, and five of the 22 ports collapse this way. Faithful to the theme, and
 * useless to a reader.
 *
 * So where the pair cannot be told apart the error is turned red — the one hue
 * no success color in these palettes uses. The brightness is then solved back to
 * the original error's, which keeps the contrast the theme chose against its own
 * background and leaves only the hue changed. That solve is why this cannot be a
 * hue rotation: green is most of a color's luminance and red is least, so a red
 * at the same HSL lightness as a green is a much darker color on screen.
 *
 * A color that already reads apart from success is returned untouched, which is
 * what 17 of the 22 ports are.
 *
 * @param error - the theme's error color.
 * @param success - the theme's success color, the one it must not be confused with.
 * @returns `error` itself, or a red standing in for it.
 */
export function distinctError(error, success) {
  if (hueGap(error, success) >= DISTINCT_HUE) return error
  if (contrast(error, success) >= DISTINCT_CONTRAST) return error
  // A palette whose *success* is the red one gains nothing here: turning the
  // error red as well would only collapse the pair from the other side.
  if (toHsv(success).saturation >= CHROMATIC && hueGap(RED, success) < DISTINCT_HUE) return error

  var saturation = Math.max(toHsv(error).saturation, RED_SATURATION)
  var target = Math.max(luminance(error), RED_FLOOR)
  var best = error
  var closest = Infinity
  for (var step = 0; step <= RED_STEPS; step += 1) {
    var candidate = fromHsv(RED, saturation, step / RED_STEPS)
    var distance = Math.abs(luminance(candidate) - target)
    if (distance < closest) {
      best = candidate
      closest = distance
    }
  }
  return best
}
