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
 * The one color step both palette builders share.
 *
 * OmaThemes' registered themes expand 14 source colors into 29 tokens, and the
 * hero field steps its inks off the same two theme tokens; both need the same
 * blend, so it lives here rather than twice.
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

exports["toRgb"] = toRgb

exports["mix"] = mix
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

const mix = __req("client/color.js").mix
const toRgb = __req("client/color.js").toRgb

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
function paletteFrom(colors) {
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
 * installed — see `desktop.js` — `System` takes its light/dark from Omarchy's
 * own `colors.toml` instead of `prefers-color-scheme`, and paints the palette
 * this package holds for the desktop's theme, matched on the slug Omarchy names
 * it with. A desktop theme with no palette here follows light/dark alone. A
 * card pressed is a choice of scheme as well as of palette — the chips move to
 * Light or Dark, because a palette chosen by hand is one the desktop no longer
 * drives, and the follow chip would claim otherwise — and pressing that chip is
 * what hands every scheme back to the desktop. With the extension installed the
 * chip is labelled **Omarchy**, because that names what the press actually
 * follows; without it the label stays **System**, and every rule above collapses
 * to what it was before: the harness's own scheme, and the automatic Catppuccin
 * pair.
 *
 * Plain JavaScript ESM, because `build/bundle-client.mjs` rewrites it into the
 * page's closure factory: `react` comes off the module table the shell seeds,
 * and every other module is relative to this directory. No JSX.
 */

const React = __req("react")
const mix = __req("client/color.js").mix
const colors = __req("client/desktop.js").colors
const installed = __req("client/desktop.js").installed
const osScheme = __req("client/desktop.js").osScheme
const reading = __req("client/desktop.js").reading
const watch = __req("client/desktop.js").watch
const watchOsScheme = __req("client/desktop.js").watchOsScheme
const paletteFrom = __req("client/desktop-palette.js").paletteFrom
const fetchJson = __req("client/dom.js").fetchJson
const insertSheet = __req("client/dom.js").insertSheet
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
  tokens['--dsw-alias-state-error-primary'] = p.error
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
  var state = { entries: [], error: '', loading: true, corners: 'square' }
  var notifier = createNotifier()
  var notify = notifier.notify
  var subscribe = notifier.subscribe

  /** `{ light: id | 'base', dark: … }` — a missing slot means "automatic". */
  var choices = loadChoices()

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
   * The harness's scheme preference, mirrored here — `light`, `dark` or
   * `system`.
   *
   * `theme.setTheme()` moves the *in-memory* preference onto whatever palette
   * this Plugin puts in force, so the live snapshot stops naming light, dark or
   * system the moment the picker paints anything, while the durable preference
   * the reader actually chose is unchanged. The only way to keep knowing it is
   * to write it down whenever it is visible; a stored value covers the window
   * after our own write, where the preference is a theme id again.
   */
  var mode = adoptMode(theme.getTheme().preference)

  /** The moment a silent desktop stops being waited for; 0 once it spoke. */
  var desktopGrace = installed() && !reading().live ? Date.now() + DESKTOP_GRACE_MS : 0
  var graceTimer = null

  function adoptMode(preference) {
    if (PREFERENCES.indexOf(preference) >= 0) return preference
    var stored = choices.mode
    return PREFERENCES.indexOf(stored) >= 0 ? stored : 'system'
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

  /** Whether `id` is one of the palettes this package registered. */
  function registered(id) {
    for (var i = 0; i < state.entries.length; i += 1) {
      if (state.entries[i].id === id) return true
    }
    var keys = Object.keys(derived)
    for (var k = 0; k < keys.length; k += 1) {
      if (derived[keys[k]] === id) return true
    }
    return false
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
    var palette = paletteFrom(colors())
    if (palette === null) return null
    var key = desktop.theme + '/' + desktop.mode
    if (Object.prototype.hasOwnProperty.call(derived, key)) return derived[key]
    var id = 'omaseek-desktop-' + desktop.theme + '-' + desktop.mode
    derived[key] = id
    try {
      derivedOffs.push(theme.register({
        id: id,
        colorScheme: desktop.mode,
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
    var desktop = reading()
    return desktop.live ? desktop.mode : osScheme()
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
        // The hand-tuned port first, and only then the desktop's own colors:
        // the port is a judgement about the theme that a derivation cannot
        // reproduce, so it wins wherever it exists.
        var ported = 'omarchy-' + desktop.theme
        if (registered(ported)) return ported
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
    if (desktop.theme === '' || registered('omarchy-' + desktop.theme)) return ''
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
    if (mode === 'system' && picked(scheme)) rememberMode(scheme)
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
      if (PREFERENCES.indexOf(snapshot.preference) >= 0) rememberMode(snapshot.preference)
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
    // The filter rule: registered themes carry exactly one colorScheme, so the
    // list follows the scheme in force — the desktop's while System follows it,
    // the reader's own Light or Dark otherwise.
    var scheme = schemeInForce()
    var listed = state.entries.filter(function (entry) { return entry.scheme === scheme })

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
      var fromSystem = mode === 'system'
      rememberMode(entry.scheme)
      try {
        // The durable half: the harness's settings take only light/dark/system,
        // so a pick for a dark palette is remembered as Dark. It is applied
        // first and the palette second, both inside this one click, so the
        // harness's own palette is never the last one the presenter is handed —
        // the pick is, and no paint happens in between.
        if (fromSystem) theme.setTheme(entry.scheme)
        theme.setTheme(entry.id)
      } catch (error) {
        state.error = String((error && error.message) || error)
        bump()
      }
    }

    // The harness's own palettes, always available. Picking Light or Dark is
    // also the opt-out for that scheme: it stops the automatic Catppuccin — or
    // the desktop — from painting over the choice on the next scheme change.
    // System forgets both slots, which is how a reader gets back to automatic,
    // and with the extension installed it is what follows the desktop.
    function base(id) {
      if (id === 'system') {
        delete choices.light
        delete choices.dark
      } else {
        choices[id] = HARNESS
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
          onClick: function () { setCorners(shape) },
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
    var unreadable = unpaintableNote()

    children.push(h('div', { key: 'legend', className: 'omaseek-row' },
      h('span', { className: 'omaseek-legend' }, scheme === 'light' ? 'Light themes' : 'Dark themes'),
      h('span', { className: 'omaseek-count' }, state.loading
        ? 'loading palettes\u2026'
        : listed.length + ' of ' + state.entries.filter(function (entry) {
          return entry.scheme === scheme
        }).length + (choices[scheme] === undefined ? ' \u00b7 automatic' : '')
        + (unreadable === '' ? '' : ' \u00b7 ' + unreadable))))

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
            snapshot.active.id === entry.id ? h('span', { className: 'omaseek-tag' }, 'active') : null))
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
