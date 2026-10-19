window.__ModuleLoader__.load({
	id: "omaseek-themes",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const __defs = Object.create(null);
		const __cache = Object.create(null);
		function __req(id) {
			if (id in __cache) return __cache[id].exports;
			const def = __defs[id];
			if (def === undefined) return require(id);
			const record = { exports: {} };
			__cache[id] = record;
			def(record, record.exports, __req);
			return record.exports;
		}
	__defs["client/color.js"] = (module, exports, __req) => {
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
function toRgb(value) {
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
function mix(from, to, amount) {
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
function luminance(value) {
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
function contrast(a, b) {
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
function distinctError(error, success) {
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

exports["toRgb"] = toRgb

exports["mix"] = mix

exports["luminance"] = luminance

exports["contrast"] = contrast

exports["distinctError"] = distinctError
	};
	__defs["client/desktop.js"] = (module, exports, __req) => {
/**
 * The Omarchy Theme Sync seam — the one file that knows the extension exists.
 *
 * Omarchy Theme Sync (github.com/omacom/omarchy-theme-sync) shares the desktop
 * palette with every page it runs on, and its own content script calls the DOM
 * that contract: `--omarchy-*` custom properties on `<html>`, plus
 * `data-omarchy-theme` and `data-omarchy-mode`, written from `document_start`
 * in every frame, and an `omarchythemechange` event after each palette. A page
 * script therefore reads the desktop with no permission of its own, which is
 * what this does; `window.omarchy` is asked only whether the extension is
 * installed at all, so a palette that has not landed yet is known to be worth
 * waiting a moment for rather than a reason to guess.
 *
 * Everything here is optional and total. Without the extension — or with it
 * installed and its native host down, which is the same thing from here — every
 * reading is "not live" and every subscription is a no-op, leaving the caller
 * on the behaviour it had before this file existed.
 *
 * The palette is read only when it has to be. OmaThemes paints its own ports of
 * the 22 home-page themes, matched by the slug Omarchy names them with, and for
 * those the raw `--omarchy-*` values are redundant. A theme with no port — one
 * from `~/.config/omarchy/themes` — has no such match, and its own colors are
 * then the only faithful answer: {@link colors} hands them to
 * `desktop-palette.js`, which derives the harness palette from them.
 */

/** The attribute carrying the desktop theme's slug. */
var THEME_ATTRIBUTE = 'data-omarchy-theme'

/** The attribute carrying `light` or `dark`. */
var MODE_ATTRIBUTE = 'data-omarchy-mode'

/** The event the extension's content script dispatches after every palette. */
var CHANGE_EVENT = 'omarchythemechange'

/** The media query the harness itself follows when nothing else speaks. */
var DARK_QUERY = '(prefers-color-scheme: dark)'

/** `<html>`, or null in a document that has none. */
function root() {
  return typeof document === 'undefined' ? null : document.documentElement
}

/** `light`, `dark`, or null when the desktop has not reported a mode. */
function modeOf(value) {
  return value === 'light' || value === 'dark' ? value : null
}

/**
 * The desktop as the extension reports it right now.
 *
 * `live` is the question every caller actually asks: the attributes are written
 * only when a palette has been applied, so an installed extension whose native
 * host is down reads exactly like no extension at all.
 * @returns `{ live, mode, theme }`; `theme` is a slug, and '' when unnamed.
 */
function reading() {
  var element = root()
  if (element === null) return { live: false, mode: null, theme: '' }
  var mode = modeOf(element.dataset.omarchyMode)
  var theme = element.dataset.omarchyTheme
  return {
    live: mode !== null,
    mode: mode,
    theme: typeof theme === 'string' ? theme : '',
  }
}

/**
 * Whether the extension is running on this page at all.
 *
 * Its page API is defined at `document_start` in the main world, before any
 * page script, and does not depend on the native host answering — which is
 * exactly what makes it the right signal for "a palette may still be coming".
 */
function installed() {
  return typeof window !== 'undefined' && window.omarchy !== undefined && window.omarchy !== null
}

/**
 * The desktop's own `colors.toml`, as the extension reports it right now.
 *
 * This is the one place the raw palette is read. The 22 home-page themes have
 * hand-tuned ports in this package and never need it, but a community theme has
 * no port, and its own colors are the only faithful answer — see
 * `desktop-palette.js`, which turns this map into the slots the harness wants.
 * Keys are `colors.toml`'s own, underscores intact (`bright_green`).
 *
 * Every failure is the same answer: `null`, meaning "no colors to be had". An
 * extension that is absent, one whose native host is down, an API that throws —
 * all of them leave the caller on whatever it did before reading.
 * @returns the color map, or null when there is none.
 */
function colors() {
  if (!installed() || typeof window.omarchy.colors !== 'function') return null
  try {
    var palette = window.omarchy.colors()
    return palette !== null && typeof palette === 'object' ? palette : null
  } catch (unavailable) {
    return null
  }
}

/**
 * Watch the desktop for as long as the caller lives.
 *
 * The change event is the extension's own notification, and the observer is the
 * belt for anything that writes the two attributes without it — the attributes
 * are the contract either way, and an observer that never fires costs nothing.
 * Neither replays what it missed, which is why every caller reads
 * {@link reading} once on its own behalf before subscribing.
 * @param onChange - called on every reported change.
 * @returns disposer removing every subscription this call added.
 */
function watch(onChange) {
  var offs = []

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener(CHANGE_EVENT, onChange)
    offs.push(function () { document.removeEventListener(CHANGE_EVENT, onChange) })
  }

  var element = root()
  if (element !== null && typeof MutationObserver === 'function') {
    var observer = new MutationObserver(onChange)
    observer.observe(element, { attributes: true, attributeFilter: [MODE_ATTRIBUTE, THEME_ATTRIBUTE] })
    offs.push(function () { observer.disconnect() })
  }

  return function () {
    for (var i = 0; i < offs.length; i += 1) offs[i]()
  }
}

/**
 * The browser's own light/dark, the scheme the harness resolves `system`
 * through: what is in force when the desktop says nothing.
 * @returns `light` or `dark`, and `light` where the query cannot be asked.
 */
function osScheme() {
  if (typeof matchMedia !== 'function') return 'light'
  try {
    return matchMedia(DARK_QUERY).matches === true ? 'dark' : 'light'
  } catch (unavailable) {
    return 'light'
  }
}

/**
 * Watch the browser's colour scheme, so `System` without a desktop still
 * follows the OS live — the harness stops doing that itself the moment this
 * Plugin pins a palette, because its listener only speaks while the preference
 * still reads `system`.
 * @param onChange - called when the OS scheme flips.
 * @returns disposer removing the listener.
 */
function watchOsScheme(onChange) {
  if (typeof matchMedia !== 'function') return function () {}
  var query
  try {
    query = matchMedia(DARK_QUERY)
  } catch (unavailable) {
    return function () {}
  }
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', onChange)
    return function () { query.removeEventListener('change', onChange) }
  }
  // Safari before 14, and anything else that predates the EventTarget shape.
  if (typeof query.addListener === 'function') {
    query.addListener(onChange)
    return function () { query.removeListener(onChange) }
  }
  return function () {}
}

exports["reading"] = reading

exports["installed"] = installed

exports["colors"] = colors

exports["watch"] = watch

exports["osScheme"] = osScheme

exports["watchOsScheme"] = watchOsScheme
	};
	__defs["client/desktop-palette.js"] = (module, exports, __req) => {
/**
 * A harness palette derived from the desktop's own `colors.toml`.
 *
 * OmaThemes paints hand-tuned ports of Omarchy's 22 home-page themes, matched
 * on the slug Omarchy writes into `theme.name`. A theme from
 * `~/.config/omarchy/themes` — a community theme, or a wallpaper variant with
 * no port here — matches nothing, and used to fall back to Catppuccin in
 * silence: the desktop said one thing and the harness wore another, with
 * nothing on screen to explain the difference.
 *
 * The extension puts the whole of that theme's `colors.toml` on the page, so
 * the palette does not have to be guessed at or omitted — it can be read. This
 * module is that reading: `window.omarchy.colors()` in, the fifteen slots
 * `tokensFor` consumes out. Nothing here touches the DOM or the extension;
 * `desktop.js` is the only file that does, and it hands the map over.
 *
 * **Names are Omarchy's, long form first.** A `colors.toml` writes
 * `dark_background`, `lighter_background`, `darker_background` — and every one
 * of Omarchy's own themes does. The short forms (`dark_bg`, `lighter_bg`) are
 * *legacy aliases* its resolver still accepts, so each lookup tries the long
 * name and then the short one; a long name is what a raw file actually holds.
 * A theme that predates the semantic palette entirely — one whose `colors.toml`
 * was generated from an `alacritty.toml` — carries `background`, `foreground`,
 * `accent`, `selection` and `color0..15` and nothing else, which is what the
 * ANSI fallbacks at the end of each lookup are for.
 *
 * **The constants below are measured, not chosen.** Omarchy hand-authors the
 * seven values it does not take straight from `colors.toml` — the two borders,
 * the two dim text steps, and the brand ink (§4.1 and §7.2 of the research
 * doc), so that porting one of the 22 is a lookup rather than a judgement. A
 * community theme has no such table, but the *relationships* those values obey
 * are stable, and they are what the ratios here reproduce: each is the blend
 * that best fits all 22 ports at once, fitted by least squares over RGB.
 * `docs/how-it-works.md` records the fit quality per ratio.
 *
 * The map is deliberately forgiving. A key the theme omits, or spells in a way
 * `color.js` cannot parse, falls through to the next candidate and finally to
 * something derived from the two anchors that really matter — the background
 * and the foreground — so a half-written `colors.toml` still yields a coherent
 * palette rather than a page painted in `#808080`.
 *
 * Nothing here is Omarchy-specific in the sense of needing Omarchy to run: the
 * inputs are a plain object of CSS colours, and every function answers for a
 * null, an empty object, or a map from anywhere else in the world.
 */

const contrast = __req("client/color.js").contrast
const mix = __req("client/color.js").mix

/**
 * How far `surface` sits from `bg` toward `lighter_background`. Fitted at 0.47
 * with a mean RGB error of 4.0 against the 22 ports — the tightest relation
 * here, and the reason `surface` is derived rather than taken from a key of its
 * own: `colors.toml` has no overlay color to read.
 */
var SURFACE_STEP = 0.47

/** `borderSubtle` as a lift of `text` over `bg` — 0.09, mean error 13.3. */
var BORDER_SUBTLE_STEP = 0.09

/** `borderStrong` as the same lift — 0.31, mean error 33.0. Hand-tuned more loosely. */
var BORDER_STRONG_STEP = 0.31

/** `textSecondary`, `text` stepped toward `bg` — 0.16, between the ports' median and their spread. */
var TEXT_SECONDARY_STEP = 0.16

/** `textMuted`, the same step further — 0.34, against a measured median of 0.30. */
var TEXT_MUTED_STEP = 0.34

/**
 * The three background steps Omarchy hand-authors, for a theme that names none
 * of them.
 *
 * Each is the fraction of the way from `background` to the anchor its direction
 * runs toward — black for a dark theme's two deeper steps, the text for its
 * raised one and for all three of a light theme's — that lands on the median of
 * the 22 stock themes' own value. Only a palette generated from an
 * `alacritty.toml` reaches them: one that has layers states them outright, and
 * a theme with no layers at all would otherwise paint its sidebar, its cards
 * and its input fields in the page colour.
 */
var STEPS = {
  dark: { deep: 0.264, deepest: 0.471, raised: 0.077 },
  light: { deep: 0.065, deepest: 0.129, raised: 0.103 },
}

/** What a dark theme's deeper layers step toward. */
var BLACK = '#000000'

/** The near-black Omarchy inks a brand fill with (§4.1 `--t-brand-ink`). */
var DARK_INK = '#0c0e10'

/** The other ink it uses, and the pair white/`DARK_INK` is what every port picks between. */
var LIGHT_INK = '#ffffff'

/** A hex triplet or sextet, and nothing else. */
var HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/**
 * Omarchy's own light/dark test (`omarchy-theme-color`): the three channels
 * summed, above 382 is a light background. Shorthand is expanded here where the
 * shell resolver would fall through to dark, because a `#fff` background is
 * light whichever way it is spelled.
 * @param value - a colour, or anything else.
 * @returns true, false, or null when there is no colour to judge.
 */
function isLight(value) {
  if (typeof value !== 'string' || !HEX.test(value.trim())) return null
  var hex = value.trim().replace('#', '')
  if (hex.length === 3) hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2)
  var n = parseInt(hex, 16)
  return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255) > 382
}

/** One colour normalized to `#rrggbb`, or null. */
function hexOf(value) {
  if (typeof value !== 'string' || !HEX.test(value.trim())) return null
  var hex = value.trim().toLowerCase().replace('#', '')
  if (hex.length === 3) hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2)
  return '#' + hex
}

/**
 * The first of `keys` that holds a usable color.
 * @param colors - the extension's map, or null.
 * @param keys - candidates, most specific first.
 * @returns the value, or null when none of them is a color.
 */
function first(colors, keys) {
  if (colors === null || typeof colors !== 'object') return null
  for (var i = 0; i < keys.length; i += 1) {
    var value = colors[keys[i]]
    if (typeof value === 'string' && HEX.test(value.trim())) return value.trim()
  }
  return null
}

/** The theme's own step, or the measured one when it names none. */
function layer(colors, keys, bg, text, light, which) {
  var named = first(colors, keys)
  if (named !== null) return named
  var anchor = !light && which !== 'raised' ? BLACK : text
  return mix(bg, anchor, STEPS[light ? 'light' : 'dark'][which])
}

/**
 * The ink that reads on a brand fill — whichever of Omarchy's two is legible.
 *
 * Omarchy hand-authors `--t-brand-ink` per theme, and the extension does not
 * forward it, so it is derived here by picking the better contrast. Checked
 * against all 22 ports this agrees with Omarchy 21 times; the exception is Rosé
 * Pine, where Omarchy inks white on `#56949f` for a 3.4:1 ratio and the
 * derivation picks the 5.7:1 near-black. Doing it by contrast can therefore
 * differ from Omarchy's taste, but never towards less legible text.
 * @param brand - the brand fill.
 * @returns `#ffffff` or the near-black ink.
 */
function inkOn(brand) {
  return contrast(brand, LIGHT_INK) >= contrast(brand, DARK_INK) ? LIGHT_INK : DARK_INK
}

/**
 * The mode Omarchy would resolve for these colors.
 *
 * Omarchy's own precedence (`omarchy-theme-color`): the `mode` key, then the
 * legacy `theme_type`, then a `light.mode` file beside the palette, then the
 * background's channel sum, and dark as the last word. That is what this walks,
 * in that order, as far as the map allows.
 *
 * Where the map comes from decides how much of it is visible. `window.omarchy`
 * carries a live theme's colors with `mode` stripped out — and answers `dark`
 * itself when a theme names none — so for a desktop in force the background is
 * the first thing that actually answers. A map read by the host out of an
 * installed theme's own file still has the key, and is believed.
 * @param colors - `window.omarchy.colors()`, a host-read palette, or anything at all.
 * @param fallback - the mode reported alongside, used when nothing else answers.
 * @returns `light` or `dark`.
 */
function schemeFrom(colors, fallback) {
  if (colors !== null && typeof colors === 'object') {
    var declared = colors.mode
    if (declared !== 'light' && declared !== 'dark') declared = colors.theme_type
    if (declared === 'light' || declared === 'dark') return declared
    var light = isLight(first(colors, ['background', 'bg', 'color0']))
    if (light !== null) return light ? 'light' : 'dark'
  }
  return fallback === 'light' || fallback === 'dark' ? fallback : 'dark'
}

/**
 * Whether a ported theme still describes what the desktop is wearing.
 *
 * A stock theme can be *overlaid*: Omarchy's own guide calls a user theme
 * directory with the same slug the preferred way to tweak one, and the stock
 * files are copied first with the user's winning on top. The slug then still
 * names this package's port while the colours underneath have moved, so a port
 * is worn only while its page colour is still the desktop's. The background is
 * the one an overlay is built on; the rest of a port is this package's reading
 * of the theme's *look*, which the home page and the desktop always disagree
 * about somewhere, and comparing those would throw away the port for themes
 * nobody has touched.
 * @param colors - `window.omarchy.colors()`, or anything else at all.
 * @param tokens - the registered port's tokens.
 * @returns true when the port may be worn, including when nothing could be read.
 */
function portAgrees(colors, tokens) {
  if (colors === null || typeof colors !== 'object') return true
  if (tokens === null || typeof tokens !== 'object') return true
  var live = hexOf(first(colors, ['background', 'bg', 'color0']))
  var ported = hexOf(tokens['--dsw-alias-bg-base'])
  return live === null || ported === null || live === ported
}

/**
 * Derive the fifteen palette slots from a desktop `colors.toml`.
 *
 * Only two keys are required — a background and a foreground — because those
 * are the two every Omarchy theme has and the two everything else is stepped
 * off. Every other slot prefers the theme's own value and falls back to a
 * derived one.
 *
 * The two dim text steps are the exception, and deliberately: Omarchy's
 * `muted` is the colour it paints *inactive and disabled* text with — the
 * harness's tertiary token is caption text — and on several of the 22 it is far
 * too dim to read there (Hackerman's `#2d3450` on `#0b0c16` is 1.9:1). The
 * measured steps keep the relationship every port was built on: dimmer than
 * the theme's own text, by the same fraction, whatever the theme.
 * @param colors - `window.omarchy.colors()`, or anything else at all.
 * @returns the palette, or null when the theme names no background/foreground.
 */
function paletteFrom(colors) {
  var bg = first(colors, ['background', 'bg', 'color0'])
  var text = first(colors, ['foreground', 'fg', 'color7'])
  if (bg === null || text === null) return null

  // The direction a theme's own steps run in, which is the only thing its
  // background can say and the thing `omarchy-theme-color` reads it for.
  var light = isLight(bg) === true

  return {
    bg: bg,
    bgDeep: layer(colors, ['dark_background', 'dark_bg'], bg, text, light, 'deep'),
    surface: mix(bg, layer(colors, ['lighter_background', 'lighter_bg'], bg, text, light, 'raised'), SURFACE_STEP),
    surface2: layer(colors, ['lighter_background', 'lighter_bg'], bg, text, light, 'raised'),
    borderSubtle: mix(bg, text, BORDER_SUBTLE_STEP),
    borderStrong: mix(bg, text, BORDER_STRONG_STEP),
    brand: first(colors, ['accent', 'blue', 'color4']) || text,
    text: text,
    textSecondary: mix(text, bg, TEXT_SECONDARY_STEP),
    textMuted: mix(text, bg, TEXT_MUTED_STEP),
    brandInk: inkOn(first(colors, ['accent', 'blue', 'color4']) || text),
    fieldBg: layer(colors, ['darker_background', 'darker_bg'], bg, text, light, 'deepest'),
    // The three state colors Omarchy takes straight from the ANSI palette
    // (§7.2): red, green and yellow, with the named keys first because a
    // theme's `color1` is a terminal slot and not always its error red.
    error: first(colors, ['red', 'color1']) || text,
    success: first(colors, ['green', 'color2']) || text,
    warn: first(colors, ['yellow', 'orange', 'color3']) || text,
  }
}

exports["schemeFrom"] = schemeFrom

exports["portAgrees"] = portAgrees

exports["paletteFrom"] = paletteFrom
	};
	__defs["client/dom.js"] = (module, exports, __req) => {
/**
 * The two seams a browser half uses.
 *
 * A sheet goes in as a tagged `<style>` the plugin owns and removes, and a call
 * to this package's Node half goes over the same authenticated `/api/*` bridge
 * the shell uses for its own data.
 */

/**
 * Put one stylesheet in the document and hand back its remover.
 * Idempotent per `id`, so a remount never doubles a sheet; the remover only
 * takes the tag away once the last feature using that id is gone.
 * @param css - the sheet's text.
 * @param id - a stable id namespaced under `omaseek`.
 * @returns disposer taking the sheet back out.
 */
function insertSheet(css, id) {
  const selector = `style[data-omaseek=${JSON.stringify(id)}]`
  const existing = document.querySelector(selector)
  if (existing !== null) {
    existing.dataset.omaseekUsers = String(Number(existing.dataset.omaseekUsers || '1') + 1)
    return removerFor(existing)
  }
  const tag = document.createElement('style')
  tag.dataset.omaseek = id
  tag.dataset.omaseekUsers = '1'
  tag.textContent = css
  document.head.appendChild(tag)
  return removerFor(tag)
}

/**
 * One remover shape for every owner, first or last: whoever leaves decrements
 * the count, and the tag goes only when the count reaches zero. (Giving the
 * first owner a plain `remove()` let a live second owner's sheet vanish under
 * it — a single duplicate row or a reused id away from a blank section.)
 */
function removerFor(tag) {
  return function () {
    const left = Number(tag.dataset.omaseekUsers || '1') - 1
    if (left > 0) {
      tag.dataset.omaseekUsers = String(left)
      return
    }
    tag.remove()
  }
}

/**
 * Ask this package's Node half for JSON over the Connection Fetch bridge.
 * The route is authenticated by the carrier before it reaches the plugin, so
 * this is an ordinary same-origin fetch — no token, no channel bookkeeping.
 * @param path - a `/api/omaseek.*` route registered by the host half.
 * @returns the parsed body.
 */
async function fetchJson(path) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`omaseek: ${path} responded ${response.status}`)
  return await response.json()
}

exports["insertSheet"] = insertSheet

exports["fetchJson"] = fetchJson
	};
	__defs["slug.js"] = (module, exports, __req) => {
/**
 * The name Omarchy prints for a theme slug.
 *
 * `omarchy theme list` runs its directory names through
 * `sed -E 's/(^|-)([a-z])/\1\u\2/g; s/-/ /g'`, and that is how a reader
 * recognises a theme — "Catppuccin Latte", not "catppuccin-latte". Both halves
 * of this package need it: the Node half names the themes it finds on the
 * machine, and the browser half names themes it only ever saw go past on the
 * desktop. It lives on its own so the two cannot drift.
 * @param slug - a theme directory name.
 * @returns the name Omarchy would print for it.
 */
function prettyName(slug) {
  return String(slug)
    .replace(/(^|-)([a-z])/g, function (match, lead, letter) { return lead + letter.toUpperCase() })
    .replace(/-/g, ' ')
}

exports["prettyName"] = prettyName
	};
	__defs["client/ui.js"] = (module, exports, __req) => {
/**
 * The two things every browser feature here builds with: `h`, and the listener
 * list behind each Settings page. A bundle cannot import from a sibling
 * package, so each package that needs them carries its own copy.
 */
const React = __req("react")

/** createElement shorthand — this package is not compiled, so no JSX. */
function h(type, props) {
  var children = []
  for (var i = 2; i < arguments.length; i += 1) children.push(arguments[i])
  return React.createElement.apply(null, [type, props].concat(children))
}

/**
 * A listener list with one broadcast, which is all three features need to make
 * a settings page follow state it does not own: the feature mutates its own
 * object and calls `notify()`, and every mounted page re-renders.
 * @returns `{ notify, subscribe }`; `subscribe` returns its own remover.
 */
function createNotifier() {
  var subs = []
  return {
    notify: function () {
      for (var i = 0; i < subs.length; i += 1) subs[i]()
    },
    subscribe: function (fn) {
      subs.push(fn)
      return function () {
        var at = subs.indexOf(fn)
        if (at >= 0) subs.splice(at, 1)
      }
    },
  }
}

exports["h"] = h

exports["createNotifier"] = createNotifier
	};
	__defs["client/themes.js"] = (module, exports, __req) => {
/**
 * OmaThemes — Omarchy home-page themes for DeepSeek Harness. Client half.
 *
 * Registers all 22 Omarchy home-page themes with the `theme` Service, then
 * contributes a Settings page listing only the themes belonging to the color
 * scheme currently in force — the five light palettes while the app is light,
 * the seventeen dark ones while it is dark. That filtering is the whole
 * design: a registered theme declares exactly one `colorScheme`, so a dark
 * palette is never offered over a light UI. The page also switches corner
 * shape, and Square is on from the moment the Plugin loads. The New Session
 * hero phrase and its pixel field are OmaPixel's, not this Plugin's.
 *
 * The palettes themselves arrive from this package's Node half over
 * `/api/omaseek.themes`, which parses them out of the research doc; only the
 * derived tokens are computed here.
 *
 * **`System` follows the desktop.** Where the Omarchy Theme Sync extension is
 * installed — see `desktop.js` — `System` takes its light/dark from the
 * desktop's own colors rather than the browser's, and paints this package's
 * port of the theme Omarchy names with that slug, or the desktop's own
 * `colors.toml` read and derived where no port exists. The scheme is the one
 * Omarchy itself resolves: the theme's `theme_type` where it has one, then its
 * background — never the extension's default for a theme that names no mode. A
 * port is worn only while it still agrees with the desktop's background, so an
 * overlaid stock theme is painted from its own colors. A card pressed is a
 * choice of scheme as well as of palette — the chips move to Light or Dark,
 * because a palette chosen by hand is one the desktop no longer drives, and the
 * follow chip would claim otherwise — and pressing that chip is what hands
 * every scheme back to the desktop. With the extension installed the chip is
 * labelled **Omarchy**, because that names what the press actually follows;
 * without it the label stays **System**, and every rule above collapses to what
 * it was before: the harness's own scheme, and the automatic Catppuccin pair.
 * Nothing in this file needs Omarchy to run: without the extension every one of
 * these branches is skipped, on any platform, and the plugin is what it was.
 *
 * Plain JavaScript ESM, because `build/bundle-client.mjs` rewrites it into the
 * page's closure factory: `react` comes off the module table the shell seeds,
 * and every other module is relative to this directory. No JSX.
 */

const React = __req("react")
const distinctError = __req("client/color.js").distinctError
const mix = __req("client/color.js").mix
const colors = __req("client/desktop.js").colors
const installed = __req("client/desktop.js").installed
const osScheme = __req("client/desktop.js").osScheme
const reading = __req("client/desktop.js").reading
const watch = __req("client/desktop.js").watch
const watchOsScheme = __req("client/desktop.js").watchOsScheme
const paletteFrom = __req("client/desktop-palette.js").paletteFrom
const portAgrees = __req("client/desktop-palette.js").portAgrees
const schemeFrom = __req("client/desktop-palette.js").schemeFrom
const fetchJson = __req("client/dom.js").fetchJson
const insertSheet = __req("client/dom.js").insertSheet
const prettyName = __req("slug.js").prettyName
const createNotifier = __req("client/ui.js").createNotifier
const h = __req("client/ui.js").h

/** Token this theme paints the user (and steering) bubble with. */
var BUBBLE = '--dsw-specific-bubble'

/**
 * Expand one 15-color research palette into the token map `theme.register`
 * consumes. A registered theme declares a single color scheme, so every token
 * is a plain value — the `{ light, dark }` pair form is only for override
 * layers, which this Plugin does not need.
 */
function tokensFor(p) {
  var tokens = {}
  // The 13 native tokens (Theme.listTokens), per the §7.2 mapping.
  tokens['--dsw-alias-bg-base'] = p.bg
  tokens['--dsw-alias-bg-layer-1'] = p.bgDeep
  tokens['--dsw-alias-bg-layer-2'] = p.surface2
  tokens['--dsw-alias-bg-overlay'] = p.surface
  tokens['--dsw-alias-border-l1'] = p.borderSubtle
  tokens['--dsw-alias-border-l2'] = p.borderStrong
  tokens['--dsw-alias-brand-primary'] = p.brand
  tokens['--dsw-alias-label-primary'] = p.text
  tokens['--dsw-alias-label-secondary'] = p.textSecondary
  // The theme's own error, unless a reader could not tell it from the success
  // color this token is always shown beside — see `distinctError`. Five of the
  // 22 ports collapse that way, and a monochrome theme is the likeliest to.
  tokens['--dsw-alias-state-error-primary'] = distinctError(p.error, p.success)
  tokens['--dsw-alias-state-success-primary'] = p.success
  tokens['--dsw-alias-state-warn-primary'] = p.warn
  tokens['--dsw-specific-sidebar-fill'] = p.bgDeep
  // design-platform tokens outside the native 13. The presenter writes every
  // key of a registered theme onto `body`, so these land like the native ones.
  tokens['--dsw-alias-label-tertiary'] = p.textMuted
  tokens['--dsw-alias-label-caption'] = p.textMuted
  tokens['--dsw-alias-link'] = p.brand
  tokens['--dsw-alias-button-primary-hover'] = mix(p.brand, p.text, 0.14)
  // The composer's send/stop button paints with the *info* fill, which the shell
  // defines as a static DeepSeek blue rather than as anything a theme can reach —
  // and its hover token has no other consumer at all. Every other primary button
  // in the shell derives from `brand-primary` and needs no help here; this one
  // button is the exception, so it is given the brand by contract rather than by
  // class name. The two remaining consumers of the fill are an active row icon
  // and a badge, both of which want the accent too.
  //
  // Set as tokens on purpose. A class-qualified rule used to do this job, and
  // when a harness rebuild renamed the composer's CSS module the rule stopped
  // matching and this button silently went back to the built-in blue. A token
  // cannot be renamed out from under a theme.
  tokens['--dsw-alias-button-info-fill'] = p.brand
  tokens['--dsw-alias-button-info-hover'] = mix(p.brand, p.text, 0.14)
  tokens['--dsw-alias-markdown-code-block'] = p.bgDeep
  tokens['--dsw-alias-markdown-inline-code'] = p.surface2
  tokens[BUBBLE] = mix(p.bg, p.brand, 0.1215)
  tokens['--dsw-specific-bubble-highlight'] = mix(p.bg, p.brand, 0.3)
  tokens['--dsw-specific-input-major'] = p.fieldBg
  tokens['--dsw-specific-login-input'] = p.fieldBg
  tokens['--dsw-specific-menu'] = p.surface
  tokens['--dsw-specific-selector'] = p.surface2
  tokens['--dsw-specific-tip'] = p.surface2
  // Omarchy picks an ink per brand (§4.1 On-brand text) so glyphs on brand
  // fills read on every palette; the send/stop sheet paints with it.
  tokens['--dsw-specific-brand-ink'] = p.brandInk
  // Sidebar interaction states are stepped off the sidebar fill itself, so
  // hover/active stay visible on themes where the layers share one color.
  var sidebar = p.bgDeep
  tokens['--dsw-specific-sidebar-nav-item-hover'] = mix(sidebar, p.text, 0.08)
  tokens['--dsw-specific-sidebar-nav-item-active'] = mix(sidebar, p.text, 0.15)
  tokens['--dsw-specific-sidebar-nav-item-active-accent'] = mix(sidebar, p.brand, 0.22)
  return tokens
}

/**
 * Corner-shape sheets, the Omarchy half of the look.
 *
 * DeepSeek Harness has no radius token — every component hard-codes its own
 * `border-radius`. But it *does* route corner shape through one token:
 * `ui-theme`'s `corner-shape.css` declares
 * `* { corner-shape: var(--dsw-corner-shape) }` at `superellipse(1.5)` —
 * a squircle. Two modes, one sheet:
 *
 * - `squircle` — the harness default, so no sheet is inserted at all.
 * - `square`   — `superellipse(infinity)`, a 90-degree corner whatever the
 *   radius, forced through every control with `!important`: the composer,
 *   bubbles, buttons and cards all get right angles, and so do the pills, the
 *   Switch capsule and the avatars that opt out with `corner-shape: round`.
 *
 * `corner-shape` is Chrome/Edge 139+; the guard leaves other engines exactly
 * as they were, and `.omaseek-warn` surfaces that rather than silently
 * doing nothing.
 */
var CORNER_SHEET = {
  square: '@supports (corner-shape: square){*,*::before,*::after{corner-shape:square!important}}',
}

var CORNER_LABELS = { squircle: 'Squircle', square: 'Square' }

/**
 * Where a scheme's remembered palette lives.
 *
 * `theme.setTheme()` persists only the harness's own `light`/`dark`/`system`
 * preference, so an Omarchy palette would be forgotten by every reload. The
 * picker keeps its own note instead: one slot per scheme, because the two are
 * never both in force — a dark palette is only ever offered over a dark UI.
 */
var STORAGE_KEY = 'omaseek.themes'

/**
 * What a scheme paints with when nobody has chosen one: the pair Omarchy itself
 * opens on. A light UI gets Catppuccin Latte, a dark one gets Catppuccin.
 */
var AUTOMATIC = { light: 'omarchy-catppuccin-latte', dark: 'omarchy-catppuccin' }

/** A scheme's slot when the reader asked for the harness's own palette. */
var HARNESS = 'base'

/**
 * The preferences the harness accepts and persists. Anything else in
 * `getTheme().preference` is a registered theme id — this Plugin's own write —
 * and says nothing about the scheme the reader chose.
 */
var PREFERENCES = ['light', 'dark', 'system']

/**
 * How long `System` waits for an installed desktop that has not reported yet.
 *
 * The extension answers a fresh page from its own cache before the shell has
 * even booted, so this only covers a cold service worker — and it is worth
 * covering, because the alternative is painting the OS scheme's palette first
 * and repainting over it, which is a visible flash of the wrong theme on every
 * load for the one person whose browser themes and desktop themes disagree.
 */
var DESKTOP_GRACE_MS = 500

var CSS = [
  '.omaseek{display:flex;flex-direction:column;gap:20px;max-width:1000px}',
  '.omaseek-title{font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary)}',
  '.omaseek-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
  '.omaseek-chip{font:inherit;font-size:12px;padding:4px 12px;border-radius:999px;cursor:pointer;',
  'border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary)}',
  '.omaseek-chip:hover{background:var(--dsw-alias-bg-layer-2)}',
  '.omaseek-chip[data-on="1"]{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);border-color:transparent}',
  '.omaseek-legend{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
  '.omaseek-count{font-size:11px;color:var(--dsw-alias-label-tertiary)}',
  '.omaseek-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:14px}',
  '.omaseek-card{position:relative;display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:12px;',
  'border:1px solid transparent;background:transparent;cursor:pointer;text-align:left;font:inherit}',
  '.omaseek-card:hover{background:var(--dsw-alias-bg-layer-2)}',
  '.omaseek-card[data-on="1"]{border-color:var(--dsw-alias-brand-primary)}',
  '.omaseek-view{display:flex;height:66px;border-radius:8px;overflow:hidden;border:1px solid var(--dsw-alias-border-l1)}',
  '.omaseek-rail{width:34%;display:flex;flex-direction:column;gap:4px;padding:7px}',
  '.omaseek-pip{height:4px;border-radius:2px;opacity:.5}',
  '.omaseek-pip[data-on="1"]{opacity:1}',
  '.omaseek-body{flex:1;display:flex;flex-direction:column;gap:5px;padding:7px}',
  '.omaseek-line{height:4px;border-radius:2px}',
  '.omaseek-bubble{height:11px;width:62%;border-radius:6px;margin-top:auto;align-self:flex-end}',
  '.omaseek-cta{position:absolute;right:14px;bottom:44px;width:9px;height:9px;border-radius:999px}',
  '.omaseek-name{display:flex;justify-content:space-between;align-items:baseline;gap:6px;font-size:12px;',
  'color:var(--dsw-alias-label-primary)}',
  '.omaseek-tag{font-size:10px;color:var(--dsw-alias-label-tertiary)}',
  '.omaseek-tags{display:flex;gap:5px;align-items:baseline;flex-shrink:0}',
  '.omaseek-warn{display:none;font-size:11px;line-height:1.6;color:var(--dsw-alias-state-warn-primary);max-width:62ch}',
  '.omaseek-error{font-size:12px;line-height:1.5;padding:10px 12px;border-radius:8px;white-space:pre-wrap;',
  'border:1px solid var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}',
  // Feature test in CSS: the Client half has no `document` to ask, so the
  // warning is hidden here and revealed only where corner-shape is missing.
  '@supports not (corner-shape: square){.omaseek-warn{display:block}}',
  // Send and stop — the site's "Get Omarchy" button scheme. Two layers, and the
  // overlap between them is deliberate:
  //
  // - the `button-info-fill` tokens in `tokensFor` carry the fill for every theme
  //   this package registers, and a token cannot be renamed out from under a
  //   theme. That is what keeps this button following the palette even if the
  //   rule below stops matching.
  // - this rule carries the fill *and* the glyph, because it is the only one of
  //   the two that can reach `color` — the composer's own rule hard-codes `#fff`
  //   there — and because it also has to hold for a reader who has not picked an
  //   Omarchy palette, where the tokens above are not in force at all.
  //
  // They share the InputBar module's single `primary` class (uV2eYG_primary).
  // The hash-qualified fragment keeps the hit exact in this build — update it if
  // a harness rebuild renames the module. Missing it costs only the glyph: the
  // fill still follows the theme through the tokens, which is how this button
  // spent a release back on the shell's blue.
  //
  // The ink falls back to the app background, never to white: `brand-ink` is a
  // token only these themes define, and the harness's own dark palette paints
  // brand as near-white — so a white fallback would leave the primary action
  // invisible for anyone who has not picked an Omarchy palette.
  'button[class*="uV2eYG_primary"]{background:var(--dsw-alias-brand-primary);',
  'color:var(--dsw-specific-brand-ink,var(--dsw-alias-bg-base))}',
  'button[class*="uV2eYG_primary"]:hover:not(:disabled){',
  'background:color-mix(in oklch, var(--dsw-alias-brand-primary), white 14%)}',
].join('\n')

function applyFeature(host) {
  // The feature attaches when its services exist: the page's plugin tree is
  // still assembling while this apply runs, so a plain `ctx.get` here would
  // read an empty tree and the section would never appear.
  host.inject(['theme', 'slots'], function (ctx) {
  var theme = ctx.get('theme')
  var slots = ctx.get('slots')
  if (theme === undefined || slots === undefined) return

  // Package-local store: the palettes arrive asynchronously from the Host,
  // and the Settings page subscribes instead of polling.
  var state = { entries: [], error: '', loading: true, corners: 'square', custom: 0, unreadable: 0 }
  var notifier = createNotifier()
  var notify = notifier.notify
  var subscribe = notifier.subscribe

  /** `{ light: id | 'base', dark: … }` — a missing slot means "automatic". */
  var choices = loadChoices()

  // The corner pick lives in the same record as the palette picks. The type
  // check keeps a hand-edited or corrupt record out of CORNER_SHEET[mode].
  if (choices.corners === 'squircle' || choices.corners === 'square') state.corners = choices.corners

  function loadChoices() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw === null) return {}
      var parsed = JSON.parse(raw)
      return parsed !== null && typeof parsed === 'object' ? parsed : {}
    } catch (unavailable) {
      // Private mode, or storage denied: the picker still works for this page,
      // it just cannot remember across reloads.
      return {}
    }
  }

  function saveChoices() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choices))
    } catch (unavailable) {
      // Same as above: a preference that cannot be written is not an error.
    }
  }

  /**
   * The themes this browser has seen the desktop wear, remembered by slug and
   * scheme.
   *
   * The installed-theme list comes from the machine the harness runs on, which
   * is not always the machine the reader is sitting at: run the server on one
   * box and the browser on another and that list is empty, while following the
   * desktop still works, because the extension reports into the page. The
   * browser is therefore the only side that ever sees those themes — so it
   * keeps the ones it has seen, and they come back as cards on the next load.
   * Recency is not tracked: the cap is generous, and using a theme again after
   * it falls out simply writes it back.
   */
  var REMEMBERED_KEY = 'omaseek.desktop'

  /** How many seen themes to keep. */
  var REMEMBERED_MAX = 40

  function loadRemembered() {
    try {
      var raw = window.localStorage.getItem(REMEMBERED_KEY)
      if (raw === null) return {}
      var parsed = JSON.parse(raw)
      return parsed !== null && typeof parsed === 'object' ? parsed : {}
    } catch (unavailable) {
      return {}
    }
  }

  /** Keep one theme the desktop has reported, for the cards of a later page. */
  function rememberTheme(slug, scheme, map) {
    if (slug === '' || map === null || map === undefined) return
    var remembered = loadRemembered()
    var key = slug + '/' + scheme
    if (Object.prototype.hasOwnProperty.call(remembered, key)) return
    remembered[key] = { slug: slug, scheme: scheme, colors: map, at: Date.now() }
    var keys = Object.keys(remembered)
    if (keys.length > REMEMBERED_MAX) {
      // Oldest first seen goes. A theme that falls out and is used again is
      // simply written back, so nothing is lost for good.
      keys.sort(function (left, right) {
        return (remembered[left].at || 0) - (remembered[right].at || 0)
      })
      for (var i = 0; i < keys.length - REMEMBERED_MAX; i += 1) delete remembered[keys[i]]
    }
    try {
      window.localStorage.setItem(REMEMBERED_KEY, JSON.stringify(remembered))
    } catch (unavailable) {
      // A theme that cannot be remembered is not an error; it just has no card.
    }
  }

  /**
   * The harness's scheme preference, mirrored here — `light`, `dark` or
   * `system`.
   *
   * `theme.setTheme()` moves the *in-memory* preference onto whatever palette
   * this Plugin puts in force, so the live snapshot stops naming light, dark or
   * system the moment the picker paints anything, while the durable preference
   * the reader actually chose is unchanged. The only way to keep knowing it is
   * to write it down whenever it is visible; a stored value covers the window
   * after our own write, where the preference is a theme id again — and at load
   * it wins outright, because the live one is only the harness's default there.
   * See `adoptMode`.
   */
  var mode = adoptMode(theme.getTheme().preference)

  /** The moment a silent desktop stops being waited for; 0 once it spoke. */
  var desktopGrace = installed() && !reading().live ? Date.now() + DESKTOP_GRACE_MS : 0
  var graceTimer = null

  function adoptMode(preference) {
    // Our own memory first, and the live preference only as the fallback.
    //
    // The harness answers a fresh page from its own default — `system` — and
    // adopts the durable preference only once the settings mirror has come back
    // over the wire, which is after every boot Plugin has already run. So the
    // preference readable here is the one the harness started with, not the one
    // the reader chose. Trusting it throws away the scheme this Plugin
    // remembered, and the adoption that follows then lands as a preference that
    // is not the mode being held — which is exactly how the change listener
    // reads a press of the Appearance row, and a press is what forgets a slot.
    var stored = choices.mode
    if (PREFERENCES.indexOf(stored) >= 0) return stored
    return PREFERENCES.indexOf(preference) >= 0 ? preference : 'system'
  }

  function rememberMode(next) {
    mode = next
    choices.mode = next
    saveChoices()
  }

  /**
   * The desktop themes this Plugin derived and registered itself, keyed by
   * `slug/mode`, so one is registered once and never twice.
   *
   * Keyed rather than listed by id because the two questions asked of it are
   * different: `derivedFor` asks "have I built this one yet", and `registered`
   * asks "is this id mine", and a slug can only be resolved against its own
   * mode. The value is the id, or null for a theme whose colors turned out to
   * be unusable — written before the registration is attempted, so the change
   * `register` publishes cannot re-enter the resolve and register it twice.
   */
  var derived = {}
  /** Disposers for `derived`, run only when this Package stops. */
  var derivedOffs = []

  /**
   * The scheme of each theme installed on this machine, by slug, as read from
   * its own file by the host.
   *
   * The live path prefers this over what it can work out from the extension's
   * map, because the file is the better source: it still has a `mode` key the
   * extension strips, and the host read it on this side of the wire. It also
   * keeps the two paths naming one theme with one id — the card the reader
   * installed and the theme the desktop is wearing are the same card.
   */
  var installedSchemes = {}

  /**
   * The registered id of each installed theme, keyed `slug/scheme`.
   *
   * The live path asks this before deriving anything: the theme the desktop is
   * wearing is very often one the host already read off the disk, and reusing
   * that registration is what makes the card the reader is looking at and the
   * theme they are wearing the same theme rather than two.
   */
  var installedIds = {}

  /** Whether `id` is one of the palettes this package registered. */
  function registered(id) {
    if (entryFor(id) !== null) return true
    var keys = Object.keys(derived)
    for (var k = 0; k < keys.length; k += 1) {
      if (derived[keys[k]] === id) return true
    }
    return false
  }

  /** The port registered under this id, or null. */
  function entryFor(id) {
    for (var i = 0; i < state.entries.length; i += 1) {
      if (state.entries[i].id === id) return state.entries[i]
    }
    return null
  }

  /**
   * The scheme the desktop is actually on.
   *
   * The extension's `mode` is not the whole answer: it defaults a theme with no
   * `mode` line to dark, and most community themes ship no line at all, while
   * Omarchy's own resolver reads such a theme from its background. The colours
   * are on the page, so the same last resort is applied here — see `schemeFrom`,
   * which is pure and knows nothing about Omarchy being present. An installed
   * theme's own file answers first where the host has read it.
   */
  function desktopScheme() {
    var slug = reading().theme
    var known = installedSchemes[slug]
    if (known === 'light' || known === 'dark') return known
    return schemeFrom(colors(), reading().mode)
  }

  /**
   * The desktop's own colors registered as one theme of this Package's making.
   *
   * A theme with a port here never reaches this — the port is hand-tuned and
   * better than anything a derivation can do. This is for the other case: a
   * community theme, which before this fell back to Catppuccin while the
   * desktop sat on something else, with nothing on screen to say so. The
   * extension carries the whole `colors.toml`, so the harness can simply wear
   * it instead — see `desktop-palette.js` for the reading itself.
   *
   * Nothing here is ever re-registered or disposed. `register` throws on a
   * duplicate id, and its disposer resets the harness preference when it
   * removes the theme backing it, so a desktop switch registers the new theme
   * and leaves the old one alone. That costs one small registration per desktop
   * theme visited in a session, which is not worth a teardown that can drop the
   * preference out from under the reader.
   * @param desktop - a live {@link reading}.
   * @returns the theme id, or null when the colors were not readable.
   */
  function derivedFor(desktop) {
    var map = colors()
    var palette = paletteFrom(map)
    if (palette === null) return null
    var scheme = desktopScheme()
    // Kept for the cards of a page whose host cannot see this machine's themes:
    // this is the only moment anything ever knows this theme exists.
    rememberTheme(desktop.theme, scheme, map)
    var key = desktop.theme + '/' + scheme
    if (Object.prototype.hasOwnProperty.call(derived, key)) return derived[key]
    var id = 'omaseek-desktop-' + desktop.theme + '-' + scheme
    derived[key] = id
    try {
      derivedOffs.push(theme.register({
        id: id,
        colorScheme: scheme,
        tokens: tokensFor(palette),
      }))
    } catch (unregistered) {
      derived[key] = null
      return null
    }
    return id
  }

  /**
   * The scheme in force: the desktop's while `System` follows it, and the OS's
   * both when there is no desktop and when the reader forced Light or Dark.
   */
  function schemeInForce() {
    if (mode !== 'system') return mode
    return reading().live ? desktopScheme() : osScheme()
  }

  /**
   * The id this scheme should be painting with, or null to leave the harness's
   * own palette alone.
   *
   * A choice the reader made for this scheme is returned as it stands — and by
   * the time it is returned, `mode` has moved to that scheme, so the desktop is
   * not consulted for it at all. What an unset slot wears while `System` follows
   * the desktop is the theme Omarchy names with that slug, in two steps: this
   * package's port of it where one exists, and the desktop's own `colors.toml`
   * read and derived where none does. The automatic Catppuccin pair is what
   * nothing at all leaves — no desktop, or one whose colors would not read.
   */
  function wantedFor(scheme) {
    var chosen = choices[scheme]
    if (chosen === HARNESS) return null
    if (typeof chosen === 'string' && chosen !== '') return chosen
    if (mode === 'system') {
      var desktop = reading()
      if (desktop.live && desktop.theme !== '') {
        // The hand-tuned port first — it is a judgement about the theme that a
        // derivation cannot reproduce — but only while it still describes what
        // the desktop is wearing. A stock slug can be *overlaid* by the reader
        // (a user theme directory with the same name, the stock files copied
        // under it), and then the port is the one palette that is wrong.
        var ported = 'omarchy-' + desktop.theme
        var port = entryFor(ported)
        if (port !== null && portAgrees(colors(), port.tokens)) return ported
        // A theme the host read off the disk is registered already, under the
        // id this would compute for it — and that registration knows a `mode`
        // the extension stripped. Prefer it over deriving a second copy.
        var read = installedIds[desktop.theme + '/' + desktopScheme()]
        if (read !== undefined) return read
        var own = derivedFor(desktop)
        if (own !== null) return own
      }
    }
    return AUTOMATIC[scheme] === undefined ? null : AUTOMATIC[scheme]
  }

  /**
   * What the picker has to explain about the desktop, if anything.
   *
   * Two states leave the harness on a palette that is not the desktop's, and
   * neither is the reader's fault, so neither should be silent:
   *
   * - **Installed but silent.** The extension is on the page and the native
   *   host has never answered, so there is not even a theme name to follow and
   *   `System` resolves to the browser's own scheme.
   * - **Named but unpaintable.** The desktop reported a theme with no port here
   *   *and* no readable colors — the one case the derivation cannot cover,
   *   which leaves the automatic Catppuccin pair standing in.
   *
   * Everything else needs no sentence: a ported theme and a derived one are
   * both the desktop's own palette, and saying so on every page would be noise.
   * @returns the note, or '' when there is nothing to explain.
   */
  function unpaintableNote() {
    if (mode !== 'system' || !installed()) return ''
    var desktop = reading()
    if (!desktop.live) return 'Omarchy Theme Sync has not reported a theme'
    if (desktop.theme === '') return ''
    // A port that still agrees is worn, and a derivation that succeeds paints
    // the desktop's own colors; only neither leaves the Catppuccin pair, and
    // that is the case with something to say about it.
    var port = entryFor('omarchy-' + desktop.theme)
    if (port !== null && portAgrees(colors(), port.tokens)) return ''
    return paletteFrom(colors()) === null
      ? 'the desktop theme "' + desktop.theme + '" reported no colors'
      : ''
  }

  /**
   * Whether the first paint is being held for a desktop that is installed but
   * has not reported. One timer, spent once: when it fires, the OS scheme's
   * palette is what shows.
   */
  function waitingForDesktop() {
    if (mode !== 'system' || Date.now() >= desktopGrace) return false
    if (reading().live) {
      desktopGrace = 0
      return false
    }
    if (graceTimer !== null) return true
    graceTimer = setTimeout(function () {
      graceTimer = null
      desktopGrace = 0
      applyForScheme()
    }, Math.max(0, desktopGrace - Date.now()))
    return true
  }

  /**
   * Whether this scheme holds a palette the reader chose by hand, as opposed to
   * the automatic pair and the `base` opt-out, neither of which is a pick.
   */
  function picked(scheme) {
    var chosen = choices[scheme]
    return typeof chosen === 'string' && chosen !== '' && chosen !== HARNESS
  }

  /**
   * Put the scheme's palette in force. Called when the palettes arrive, when
   * the scheme flips, and when the desktop reports — and never in a loop:
   * applying what is already active is the one case that returns early, and
   * `setTheme` is what fires the change this listens for.
   */
  function applyForScheme() {
    if (state.loading || state.error !== '') return
    if (waitingForDesktop()) return
    var scheme = schemeInForce()
    // A slot chosen while System was lit is a scheme statement in its own
    // right — the desktop is not driving that palette, so System is not what
    // the reader is on. The first cut of following the desktop left exactly
    // that state behind in a stored pick, so it is mended here, once, on the
    // first resolve that knows which scheme the pick belongs to.
    if (mode === 'system' && picked(scheme)) {
      rememberMode(scheme)
      // The durable half has to move with it, for the same reason `choose()`
      // writes it: a scheme this Plugin settled on without telling the harness
      // is a scheme whose next re-adoption arrives as a preference that is not
      // the mode being held, and the change listener can only read that as a
      // press of the Appearance row — which is the one thing allowed to forget a
      // slot. Writing it here is what keeps the harness's preference and this
      // Plugin's mode telling the same story from the first resolve on.
      try {
        theme.setTheme(scheme)
      } catch (unregistered) {
        // A built-in preference is always registered; nothing to recover from.
      }
    }
    var wanted = wantedFor(scheme)
    if (wanted === null) return
    var snapshot = theme.getTheme()
    if (wanted === snapshot.active.id) return
    // Only a palette this package registered: ids come from the research doc,
    // and a doc that dropped one should leave the harness palette rather than
    // throw inside a theme-change listener.
    if (!registered(wanted)) return
    try {
      theme.setTheme(wanted)
    } catch (error) {
      state.error = String((error && error.message) || error)
      notify()
    }
  }

  /**
   * Repair the palette after the dispatch that reset it, never inside it.
   *
   * Writing *any* settings section republishes the settings mirror — picking a
   * model writes `agent-default-model` — and ui-theme answers by adopting the
   * durable `light`/`dark`/`system` preference over whatever this Package had
   * put in force, which is a reset this Plugin has to survive. `setTheme`
   * publishes synchronously, so repairing from inside the listener below emits
   * a nested snapshot while the outer dispatch is still being delivered, and a
   * listener registered after this one — ui-layout's token presenter among
   * them — is handed that outer, resetting snapshot last and paints it. The
   * Service still holds the wanted id by then, so `applyForScheme` returns
   * early from that moment on and nothing ever repaints: Settings reads the
   * Omarchy theme while the app wears the harness palette, until the reader
   * clicks a card.
   *
   * One microtask is all it takes to be last. It runs after the whole dispatch
   * has settled and before the browser paints, so the repair is final and
   * invisible, and the flag folds the several publications one settings write
   * produces into a single repair.
   */
  var repairPending = false
  var stopped = false
  function repair() {
    if (repairPending || stopped) return
    repairPending = true
    Promise.resolve().then(function () {
      repairPending = false
      if (!stopped) applyForScheme()
    })
  }

  // Corner shape lives outside the Settings page: it restyles the whole
  // harness, so it stays applied after the page closes. One owned sheet,
  // swapped rather than stacked.
  var cornerOff = null
  function setCorners(mode) {
    if (cornerOff !== null) { cornerOff(); cornerOff = null }
    state.corners = mode
    if (CORNER_SHEET[mode] !== undefined) cornerOff = insertSheet(CORNER_SHEET[mode], 'omaseek:corners')
    notify()
  }
  // The Omarchy reading is the default: square the moment the Plugin loads.
  setCorners(state.corners)

  ctx.effect(function () { return insertSheet(CSS, 'omaseek:base') }, 'omaseek: styles')
  ctx.effect(function () {
    // The style tags go with the run anyway; this disposes the corner sheet
    // on its own too, so an update that never set a corner mode is clean.
    return function () { if (cornerOff !== null) cornerOff() }
  }, 'omaseek: corner sheet')

  ctx.effect(function () {
    var live = true
    var disposers = []
    fetchJson('/api/omaseek.themes').then(function (result) {
      var themes = (result && result.themes) || []
      var installed = (result && result.installed) || {}
      var entries = []
      try {
        for (var i = 0; i < themes.length; i += 1) {
          var raw = themes[i]
          var id = 'omarchy-' + raw.id
          var tokens = tokensFor(raw.palette)
          if (!live) return
          disposers.push(theme.register({ id: id, colorScheme: raw.scheme, tokens: tokens }))
          entries.push({ id: id, name: raw.name, scheme: raw.scheme, tokens: tokens })
        }
        // The themes that are the machine's own, in one list with the 22. Each
        // arrives as its own file's colours — or, for one only ever seen go past
        // on the desktop, as the colours the extension reported — so the same
        // derivation the desktop's live theme goes through builds its tokens:
        // one implementation of what a `colors.toml` means, the one already
        // checked against all 22 real files.
        var schemes = {}
        var custom = 0
        var unreadable = Number(installed.skipped) || 0
        var taken = {}
        for (var t = 0; t < entries.length; t += 1) taken[entries[t].id] = true

        function addOwn(slug, name, ownColors) {
          var ownPalette = paletteFrom(ownColors)
          if (ownPalette === null) {
            unreadable += 1
            return
          }
          var ownScheme = schemeFrom(ownColors, null)
          schemes[slug] = ownScheme
          var ownId = 'omaseek-desktop-' + slug + '-' + ownScheme
          // Recorded before any skip, because the id is the same whether this
          // pass registers it or the live path got there first.
          installedIds[slug + '/' + ownScheme] = ownId
          // The live path may have registered this theme already — it is the
          // same id, so the desktop's own theme is this card and not a copy.
          if (taken[ownId] === true || registered(ownId)) return
          var ownTokens = tokensFor(ownPalette)
          if (!live) return
          disposers.push(theme.register({ id: ownId, colorScheme: ownScheme, tokens: ownTokens }))
          taken[ownId] = true
          custom += 1
          entries.push({ id: ownId, name: name, scheme: ownScheme, tokens: ownTokens, custom: true })
        }

        var listed = installed.themes || []
        for (var j = 0; j < listed.length; j += 1) {
          addOwn(listed[j].slug, listed[j].name, listed[j].colors)
        }
        // Then the themes this browser has seen the desktop wear, which is the
        // only list there is when the harness runs on a different machine than
        // the one with the themes on it. The host's own list wins a name, since
        // it was read from the file rather than from what went past.
        var remembered = loadRemembered()
        var seen = Object.keys(remembered)
        for (var r = 0; r < seen.length; r += 1) {
          var past = remembered[seen[r]]
          if (past === null || typeof past !== 'object' || past.slug === undefined) continue
          addOwn(past.slug, prettyName(past.slug), past.colors)
        }
        installedSchemes = schemes
        state.custom = custom
        state.unreadable = unreadable
      } catch (registerError) {
        // A throw mid-loop leaves the earlier registrations owned by this
        // effect, so stopping still cleans them up.
        state.error = String((registerError && registerError.message) || registerError)
        state.loading = false
        notify()
        return
      }
      state.entries = entries.sort(function (a, b) { return a.name.localeCompare(b.name) })
      state.error = ''
      state.loading = false
      applyForScheme()
      notify()
    }, function (error) {
      if (!live) return
      state.error = String((error && error.message) || error)
      state.loading = false
      notify()
    })
    return function () {
      live = false
      // Disposing the theme that backs the active preference resets it, so
      // stopping this Package can never leave the UI on a dead palette.
      for (var i = disposers.length - 1; i >= 0; i -= 1) disposers[i]()
    }
  }, 'omaseek: theme registry')

  ctx.effect(function () {
    // The derived desktop themes, disposed with everything else this Package
    // registered. Disposing the one backing the active preference resets it,
    // which is the point: stopping the Package must never leave the UI wearing
    // a palette nothing owns any more.
    return function () {
      for (var i = derivedOffs.length - 1; i >= 0; i -= 1) derivedOffs[i]()
      derivedOffs.length = 0
      derived = {}
    }
  }, 'omaseek: derived desktop themes')

  ctx.effect(function () {
    // Light and dark each remember a palette, so the scheme decides which one
    // is in force — a click on Light is not a request to forget the dark pick.
    // Deferred, because re-applying inside the change it answers loses: see
    // `repair`.
    var off = ctx.on('theme/change', function (snapshot) {
      // A reader's preference, from this picker or the Appearance row in
      // General. A theme id is this Plugin's own write and is left alone.
      //
      // The chips set the mode before they write the preference, so a valid
      // preference that is *not* the mode being held did not come from them: it
      // is the Appearance row, which is the one control that means the harness's
      // own palettes. Read it that way — Light or Dark there pins that scheme to
      // the harness palette, System hands both schemes back to the desktop —
      // or the row would set a preference this picker then paints over.
      if (PREFERENCES.indexOf(snapshot.preference) >= 0 && snapshot.preference !== mode) {
        if (snapshot.preference === 'system') {
          delete choices.light
          delete choices.dark
        } else {
          choices[snapshot.preference] = HARNESS
        }
        rememberMode(snapshot.preference)
      }
      repair()
    })
    return function () {
      stopped = true
      off()
    }
  }, 'omaseek: scheme palette')

  ctx.effect(function () {
    // The desktop's theme and mode, live: the extension pushes both whenever
    // `omarchy-theme-set` swaps them, so a `System` scheme follows the desktop
    // without a reload, and a desktop theme that is one of ours repaints the
    // harness. The OS scheme is watched separately because the harness stops
    // listening to it itself once this Plugin has pinned a palette.
    var offDesktop = watch(function () { repair() })
    var offOs = watchOsScheme(function () { repair() })
    return function () {
      offDesktop()
      offOs()
      if (graceTimer !== null) {
        clearTimeout(graceTimer)
        graceTimer = null
      }
    }
  }, 'omaseek: desktop watch')

  /** One theme card: a miniature of the palette, painted with its own tokens. */
  function Swatch(props) {
    var t = props.tokens
    return h('div', { className: 'omaseek-view', style: { background: t['--dsw-alias-bg-base'] } },
      h('div', { className: 'omaseek-rail', style: { background: t['--dsw-specific-sidebar-fill'] } },
        h('div', { className: 'omaseek-pip', style: { background: t['--dsw-alias-label-secondary'] } }),
        h('div', { className: 'omaseek-pip', 'data-on': '1', style: { background: t['--dsw-specific-sidebar-nav-item-active'] } }),
        h('div', { className: 'omaseek-pip', style: { background: t['--dsw-alias-label-secondary'] } })),
      h('div', { className: 'omaseek-body' },
        h('div', { className: 'omaseek-line', style: { background: t['--dsw-alias-label-primary'], width: '80%' } }),
        h('div', { className: 'omaseek-line', style: { background: t['--dsw-alias-label-secondary'], width: '56%' } }),
        h('div', { className: 'omaseek-bubble', style: { background: t[BUBBLE] } })),
      h('div', { className: 'omaseek-cta', style: { background: t['--dsw-alias-brand-primary'] } }))
  }

  function ThemePage() {
    var tick = React.useState(0)
    // Functional update: the subscription outlives the render that created it.
    var bump = function () { tick[1](function (n) { return n + 1 }) }
    React.useEffect(function () {
      var off = subscribe(bump)
      var offTheme = ctx.on('theme/change', bump)
      return function () { off(); offTheme() }
    }, [])

    var snapshot = theme.getTheme()
    // One list, both schemes. A registered theme still carries exactly one
    // `colorScheme` — that is what the presenter paints `body` from, so pressing
    // a light card in a dark app repaints it light — but the picker no longer
    // hides half the themes behind the one currently in force. The chips are
    // what changes the scheme; a card is a palette, and choosing one moves the
    // chips to the scheme it belongs to.
    var scheme = schemeInForce()
    var listed = state.entries

    function choose(entry) {
      // Pressing the palette already in force is not a choice. While System
      // follows the desktop, the lit card *is* the desktop's own theme, and a
      // press on it must not quietly stop the following — so it does nothing,
      // the way pressing the current item anywhere else does.
      if (mode === 'system' && entry.id === theme.getTheme().active.id) return
      // Remembered against its own scheme: a light pick is not a statement
      // about what a dark UI should wear. It is a statement about the scheme
      // itself, too — a palette chosen by hand is not one the desktop is
      // driving, so the chips move to Light or Dark with it. Leaving System lit
      // would claim the desktop still has a say in a palette it no longer
      // touches, and the next desktop switch would visibly do nothing.
      choices[entry.scheme] = entry.id
      // The schemes are one list now, so a press can move the scheme as well as
      // the palette — and the harness's own settings have to be told, or the
      // next settings write would adopt the old scheme and drag the app back.
      var moved = mode !== entry.scheme
      rememberMode(entry.scheme)
      try {
        // The durable half: the harness's settings take only light/dark/system,
        // so a pick for a dark palette is remembered as Dark. It is applied
        // first and the palette second, both inside this one click, so the
        // harness's own palette is never the last one the presenter is handed —
        // the pick is, and no paint happens in between.
        if (moved) theme.setTheme(entry.scheme)
        theme.setTheme(entry.id)
      } catch (error) {
        state.error = String((error && error.message) || error)
        bump()
      }
    }

    // The pair this package opens on, for that scheme. Light and Dark are the
    // default palettes rather than an escape hatch: pressing one puts Catppuccin
    // Latte or Catppuccin in force, remembers it as that scheme's pick, and the
    // card lights up with it. System forgets both slots, which is how a reader
    // gets back to following the desktop. The harness's own palettes were never
    // a thing an Omarchy picker offered — they are the Appearance row's, in
    // General, and the change listener reads that press the way it reads this
    // one: Light or Dark there is the harness's palette for that scheme, System
    // is what follows.
    function base(id) {
      if (id === 'system') {
        delete choices.light
        delete choices.dark
      } else {
        choices[id] = AUTOMATIC[id] === undefined ? HARNESS : AUTOMATIC[id]
      }
      rememberMode(id)
      try { theme.setTheme(id) } catch (error) {
        state.error = String((error && error.message) || error)
        bump()
      }
      // `setTheme` returns early when the preference already reads `id`, so the
      // change listener is not guaranteed to fire for this press; resolve here
      // as well, so following the desktop starts on the press rather than on
      // the next settings write.
      applyForScheme()
    }

    var children = [
      h('div', { key: 'head' }, h('div', { className: 'omaseek-title' }, 'OmaThemes')),
    ]

    if (state.error !== '') {
      children.push(h('div', { key: 'err', className: 'omaseek-error' }, state.error))
    }

    children.push(h('div', { key: 'corners', className: 'omaseek-row' },
      h('span', { className: 'omaseek-legend' }, 'Corners'),
      ['squircle', 'square'].map(function (shape) {
        return h('button', {
          key: shape,
          className: 'omaseek-chip',
          type: 'button',
          'data-on': state.corners === shape ? '1' : '0',
          onClick: function () {
            // Persist only a reader's own press, so the load-time
            // setCorners(state.corners) never pins the default into storage.
            choices.corners = shape
            saveChoices()
            setCorners(shape)
          },
        }, CORNER_LABELS[shape])
      })))

    // Purely a feature notice: hidden by the CSS, revealed only where
    // corner-shape is missing and the choice therefore does nothing.
    children.push(h('div', { key: 'corner-warn', className: 'omaseek-warn' },
      'This browser has no corner-shape (Chrome or Edge 139+), so the corner setting'
      + ' has no effect here. DeepSeek Harness ships the same guard for its own'
      + ' superellipse corners.'))

    // The chips read the preference, not the scheme the presenter resolved:
    // while System follows the desktop it stays the lit one, which is the truth
    // about what the reader chose — what is being painted is the desktop's.
    //
    // System is also the one control whose meaning the extension changes, so it
    // is the one control that renames itself. With the extension installed
    // "System" would be a promise about the browser that the desktop is about to
    // overrule; "Omarchy" is what the press actually does. Without the extension
    // the word stays, and so does every rule behind it.
    var followsDesktop = installed()

    children.push(h('div', { key: 'base', className: 'omaseek-row' },
      h('span', { className: 'omaseek-legend' }, 'Scheme'),
      h('button', { className: 'omaseek-chip', type: 'button', 'data-on': mode === 'light' ? '1' : '0', onClick: function () { base('light') } }, 'Light'),
      h('button', { className: 'omaseek-chip', type: 'button', 'data-on': mode === 'dark' ? '1' : '0', onClick: function () { base('dark') } }, 'Dark'),
      h('button', {
        className: 'omaseek-chip',
        type: 'button',
        'data-on': mode === 'system' ? '1' : '0',
        title: followsDesktop ? 'Automatically change based on current Omarchy theme' : undefined,
        onClick: function () { base('system') },
      }, followsDesktop ? 'Omarchy' : 'System')))

    // The one thing the picker still has to explain: a desktop it is not
    // wearing, either because nothing was reported or because what was reported
    // could not be painted. Said in the count line rather than a row of its own,
    // and said only when it is true.
    var desktopNote = unpaintableNote()

    // The count line carries what the grid cannot say for itself: how many
    // themes are the machine's own, how many could not be read at all, and
    // whether the scheme in force is the automatic pair rather than any card.
    children.push(h('div', { key: 'legend', className: 'omaseek-row' },
      h('span', { className: 'omaseek-legend' }, 'Themes'),
      h('span', { className: 'omaseek-count' }, state.loading
        ? 'loading palettes\u2026'
        : listed.length + ' themes'
          + (state.custom === 0 ? '' : ' \u00b7 ' + state.custom + ' installed')
          + (state.unreadable === 0 ? '' : ' \u00b7 ' + state.unreadable + ' unreadable')
          + (choices[scheme] === undefined ? ' \u00b7 automatic' : '')
          + (desktopNote === '' ? '' : ' \u00b7 ' + desktopNote))))

    children.push(h('div', { key: 'grid', className: 'omaseek-grid' },
      listed.map(function (entry) {
        return h('button', {
          key: entry.id,
          className: 'omaseek-card',
          type: 'button',
          'data-on': snapshot.active.id === entry.id ? '1' : '0',
          onClick: function () { choose(entry) },
        },
          h(Swatch, { tokens: entry.tokens }),
          h('div', { className: 'omaseek-name' },
            h('span', null, entry.name),
            h('span', { className: 'omaseek-tags' },
              snapshot.active.id === entry.id ? h('span', { className: 'omaseek-tag' }, 'active') : null,
              entry.custom === true ? h('span', { className: 'omaseek-tag' }, 'custom') : null)))
      })))

    return h('div', { className: 'omaseek' }, children)
  }

  ctx.effect(function () {
    return slots.inject('settings.section', function () {
      return slots.register(
        { name: 'settings.section', id: 'omarchy-themes', order: 12, label: 'OmaThemes' },
        ThemePage,
      )
    })
  }, 'omaseek: settings page')
  })
}

exports["applyFeature"] = applyFeature
	};
	__defs["client.js"] = (module, exports, __req) => {
/**
 * The `omaseek-themes` browser half.
 *
 * One package is one browser plugin — the client-module system mounts a browser
 * half by its package's bare name, and a row carries no more than that — so each
 * feature owns its entry, its bundle and its row on the Plugins page.
 */

const applyThemes = __req("client/themes.js").applyFeature

function apply(ctx) {
  applyThemes(ctx)
}

exports["apply"] = apply
	};
	const __entry = __req("client.js");
	if (typeof __entry.apply !== "function") {
		throw new Error("omaseek-themes: client entry exports no apply()");
	}
	for (const key of Object.keys(__entry)) exports[key] = __entry[key];
	return module.exports;
	},
});
