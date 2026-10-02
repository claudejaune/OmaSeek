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
export function reading() {
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
export function installed() {
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
export function colors() {
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
export function watch(onChange) {
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
export function osScheme() {
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
export function watchOsScheme(onChange) {
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
