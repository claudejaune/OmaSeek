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

import { contrast, mix } from './color.js'

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
export function schemeFrom(colors, fallback) {
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
export function portAgrees(colors, tokens) {
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
export function paletteFrom(colors) {
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
