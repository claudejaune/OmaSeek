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
 */

import { mix, toRgb } from './color.js'

/**
 * How far `surface` sits from `bg` toward `lighter_bg`. Fitted at 0.47 with a
 * mean RGB error of 4.0 against the 22 ports — the tightest relation here, and
 * the reason `surface` is derived rather than taken from a key of its own:
 * `colors.toml` has no overlay color to read.
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

/** The near-black Omarchy inks a brand fill with (§4.1 `--t-brand-ink`). */
var DARK_INK = '#0c0e10'

/** The other ink it uses, and the pair white/`DARK_INK` is what every port picks between. */
var LIGHT_INK = '#ffffff'

/** A hex triplet or sextet, and nothing else. */
var HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

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

/**
 * WCAG relative luminance, on the same scale `contrast` divides.
 * @param value - a hex color.
 * @returns luminance in 0..1.
 */
function luminance(value) {
  var rgb = toRgb(value)
  var out = 0
  var weights = [0.2126, 0.7152, 0.0722]
  for (var i = 0; i < 3; i += 1) {
    var channel = rgb[i] / 255
    out += weights[i] * (channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4))
  }
  return out
}

/** WCAG contrast ratio between two hex colors. */
function contrast(a, b) {
  var one = luminance(a)
  var two = luminance(b)
  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05)
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
 * Derive the fifteen palette slots from a desktop `colors.toml`.
 *
 * Only two keys are required — a background and a foreground — because those
 * are the two every Omarchy theme has and the two everything else is stepped
 * off. Every other slot prefers the theme's own value and falls back to a
 * derived one.
 * @param colors - `window.omarchy.colors()`, or anything else at all.
 * @returns the palette, or null when the theme names no background/foreground.
 */
export function paletteFrom(colors) {
  var bg = first(colors, ['background', 'bg', 'dark_bg', 'color0'])
  var text = first(colors, ['foreground', 'fg', 'bright_fg', 'color7', 'light_fg'])
  if (bg === null || text === null) return null

  // Omarchy's own layering, verified monotonic across every theme sampled:
  // darker_bg <= dark_bg <= background <= lighter_bg. The sidebar takes the
  // step below the page, the raised surface the step above it.
  var lighter = first(colors, ['lighter_bg', 'dark_bg']) || bg
  var deeper = first(colors, ['dark_bg', 'darker_bg']) || bg
  var brand = first(colors, ['accent', 'blue', 'color4']) || text

  return {
    bg: bg,
    bgDeep: deeper,
    surface: mix(bg, lighter, SURFACE_STEP),
    surface2: lighter,
    borderSubtle: mix(bg, text, BORDER_SUBTLE_STEP),
    borderStrong: mix(bg, text, BORDER_STRONG_STEP),
    brand: brand,
    text: text,
    textSecondary: mix(text, bg, TEXT_SECONDARY_STEP),
    textMuted: mix(text, bg, TEXT_MUTED_STEP),
    brandInk: inkOn(brand),
    fieldBg: first(colors, ['darker_bg', 'dark_bg']) || bg,
    // The three state colors Omarchy takes straight from the ANSI palette
    // (§7.2): red, green and yellow, with the named keys first because a
    // theme's `color1` is a terminal slot and not always its error red.
    error: first(colors, ['red', 'color1']) || text,
    success: first(colors, ['green', 'color2']) || text,
    warn: first(colors, ['yellow', 'orange', 'color3']) || text,
  }
}
