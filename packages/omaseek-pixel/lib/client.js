window.__ModuleLoader__.load({
	id: "omaseek-pixel",
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
	__defs["client/pixel.js"] = (module, exports, __req) => {
/**
 * OmaPixel — the New Session hero's fancy pixels for DeepSeek Harness.
 *
 * The New Session hero's headline runs the site's rotation: type a phrase,
 * hold, delete back to the "We can fix every" front the phrases share, type
 * on to the next (the `once` mode types one random phrase per load and
 * stops). And the hero sits in the omarchy.org hero's pixel field: a
 * dithered lattice that drifts behind the composer column, lights under the
 * cursor, and takes a press by stamping the Omarchy mark out of the click
 * point.
 *
 * This is the browser half of the `omaseek` package. It reads the theme now
 * in force straight off the page (the `--dsw-alias-*` variables on `body`)
 * and remounts on `theme/change`, which is how it follows an OmaThemes palette:
 * the field paints with whatever the page carries, shipped theme or fallback
 * inks below. It asks the Node half for nothing.
 *
 * Plain JavaScript ESM, because `build/bundle-client.mjs` rewrites it into the
 * page's closure factory: `react` comes off the module table the shell seeds,
 * and every other module is relative to this directory. No JSX.
 */

const React = __req("react")
const mix = __req("client/color.js").mix
const insertSheet = __req("client/dom.js").insertSheet
const createNotifier = __req("client/ui.js").createNotifier
const h = __req("client/ui.js").h

/**
 * What the New Session hero's pixel field does.
 * `off` runs nothing at all; `ambient` is the drifting lattice on its own;
 * `interactive` adds cursor glow and press-to-stamp interaction.
 */
var FIELD_MODES = ['off', 'ambient', 'interactive']
var FIELD_LABELS = { off: 'Off', ambient: 'Ambient', interactive: 'Interactive' }

/**
 * How the headline types. `loop` is the site's rotation: type a phrase, hold,
 * delete back to the front the phrases share — "We can fix every" — and type
 * on to the next, forever. `once` is the one-shot sheet: a random phrase,
 * typed once per run, then still.
 */
var TYPE_MODES = ['loop', 'once']
var TYPE_LABELS = { loop: 'Loop', once: 'Once' }

/** Where the section's two choices are remembered across reloads. */
var STORAGE_KEY = 'omaseek.pixel'

/** The shipped headline span; the sibling badge is told apart by its class. */
var TITLE_SELECTOR = '[class*="titleGroup"] > span:not([class*="previewBadge"])'

/**
 * The New Session hero's headline, replaced per Plugin load.
 *
 * The shipped headline is a plain `t('hero.headline')` span with no Slot of
 * its own, and its locale dictionary is single-occupant — so the sheet is
 * the surface: hide the shipped glyphs (`font-size: 0`) and let an `::after`
 * speak the chosen phrase, inheriting the headline's own
 * `--dsw-alias-label-primary`.
 *
 * The typing mirrors omarchy.org's `TypewriterTail` rhythm (≈58 ms a
 * keystroke plus jitter averages ~88 ms) but differs on purpose: every
 * letter of the phrase animates — not just a tail after a static prefix —
 * exactly once, then it stops. A `steps(len)` clip on the pseudo-element is
 * the one primitive that reveals left to right with no per-letter DOM, and
 * an absolutely positioned caret pseudo walks the same steps and then blinks
 * at the end, like the site's idle caret.
 */
var HERO_PHRASES = [
  'We can fix every paper cut',
  'We can fix everything',
  'We can fix every missing app',
  'We can fix every incompatibility',
]

/** One hero sheet for one phrase: replacement always, typing when motion is fine. */
function heroSheet(phrase) {
  var len = phrase.length
  var ms = Math.round(len * 88)
  var start = 350
  var title = TITLE_SELECTOR
  return [
    title + '{position:relative;font-size:0}',
    title + '::after{content:"' + phrase + '";display:inline-block;font-size:26px;line-height:32px;',
    'font-weight:500;white-space:pre-wrap;max-width:100%}',
    // px, not em: the host span sits at font-size 0, where em would vanish.
    '@media (prefers-reduced-motion: no-preference){',
    title + '::after{clip-path:inset(-0.1em 100% -0.2em 0);',
    'animation:omap-hero-type ' + ms + 'ms steps(' + len + ',end) ' + start + 'ms forwards}',
    title + '::before{content:"";position:absolute;left:0;top:50%;width:3px;height:28px;margin-top:-14px;',
    'background:var(--dsw-alias-brand-primary);',
    'animation:omap-hero-caret ' + ms + 'ms steps(' + len + ',end) ' + start + 'ms forwards,',
    'omap-hero-blink 1.06s step-end ' + (start + ms + 500) + 'ms infinite}',
    '}',
    // The overshoot past 0% keeps the last glyph's edge off the clip line.
    '@keyframes omap-hero-type{from{clip-path:inset(-0.1em 100% -0.2em 0)}to{clip-path:inset(-0.1em -1% -0.2em 0)}}',
    '@keyframes omap-hero-caret{from{left:0}to{left:100%}}',
    '@keyframes omap-hero-blink{0%,50%{opacity:1}50.01%,100%{opacity:0}}',
  ].join('\n')
}

/* ── Hero pixel field ─────────────────────────────────────────────────
 *
 * The omarchy.org hero's field, ported: a lattice of square cells whose
 * resting luminance comes from a drifting value-noise blob, dithered to
 * those cells with a classic 8×8 Bayer matrix, lit further by the pointer,
 * and stamped by a press with the Omarchy mark growing out of the click
 * point and dissolving back through the dither.
 *
 * Three pieces of the site's hero are deliberately absent. The wordmark
 * reveal is `ttfx`, a WASM terminal engine the site loads as
 * `/ttfx/0.3.2/ttfx.js` + `all.wasm`; there is no Omarchy wordmark here to
 * reveal, and a Plugin ships no bundle. The music spectrum needs the audio
 * graph, which lives in OmaMusic. The wandering sprite is the site's own
 * idle motion and stays on the site: this field answers the user, nothing
 * else.
 *
 * The canvas is a `z-index:-1` child of the conversation root while that
 * root is in its `hero` phase, so it paints above the panel's own
 * background and below everything the harness draws — no product element is
 * restacked, no Slot is replaced. It covers the whole panel, exactly as the
 * site's canvas covers its hero section: the clear column the hero stands in
 * is a ramp, not a clip, so there is no straight edge anywhere in it.
 * ───────────────────────────────────────────────────────────────────── */

/**
 * The site's lattice, derived rather than hard-coded: its grid is the
 * wordmark slot — 88 % of the section, less a 48 px inset, capped at 896 px —
 * split into the wordmark's 81 columns, which lands near 11 CSS px on a wide
 * hero. A fixed cell is what made our field read as twice the site's density.
 */
var GRID_CELLS = 81
var SLOT_FRACTION = 0.88
var SLOT_INSET = 48
var SLOT_MAX = 896
/** Floor for that derivation, in CSS px, so a narrow panel still has a field. */
var CELL_MIN_CSS = 3
/** Tileable value noise, and how many cells one blob covers. */
var NOISE_SIZE = 128
var CELLS_PER_NOISE = 9
/** Cursor reach, in cells. */
var CURSOR_CELLS = 12
/** Frame throttle: the site repaints at most every 25 ms. */
var FRAME_MS = 25
/** Press charge: a full second and a change is a big stamp. */
var CHARGE_TIME = 1.1
var CHARGE_FROM = 0.45
var CHARGE_GROWTH = 1.6
/**
 * The site's clear oval, per axis: nothing inside RAMP_INNER, full density
 * past RAMP_INNER + RAMP_SPAN. An oval of radius 1 is the half-extent of the
 * canvas *on that axis*, so the shape scales with the panel instead of
 * saturating the way a single half-width did.
 */
var RAMP_INNER = 0.42
var RAMP_SPAN = 0.85
/** The clear region is a shade taller than wide, as the hero's copy is. */
var RAMP_Y_SCALE = 0.82
/**
 * The site's vertical gradient: the first RAMP_FADE_PX of the field fades up
 * from RAMP_FLOOR, so the top of the hero is quiet and the density arrives
 * below the fold of the copy.
 */
var RAMP_FLOOR = 0.16
var RAMP_TOP_PX = 24
var RAMP_FADE_PX = 130

/** Classic 8x8 ordered dither matrix, 0..63. */
var BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36,
  14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
]

/**
 * The square-spiral Omarchy mark as a 15×15 bitmap, from the site's own
 * `omarchy-logo.svg`. A press stamps this onto the cell grid, growing from
 * under one cell per logo pixel to a few, and dissolving through the dither.
 */
var LOGO_SIZE = 15
var LOGO_ROWS = [
  '111111111111111',
  '100000010000001',
  '101111110001101',
  '101000000000101',
  '101000000000101',
  '101000000000101',
  '101000000000101',
  '111000000000101',
  '101000000000101',
  '101000000000101',
  '101000000000101',
  '101000000000101',
  '101111111111101',
  '100000010000001',
  '111111110111111',
]

/** The field's inks, stepped off the theme now in force. */
function fieldPalette() {
  // The active theme's tokens are inline variables on `body` — the presenter
  // projects them there, not onto `documentElement` — while the shipped base
  // palette is declared further up the tree. Read `body` first and fall back,
  // or every lookup misses and the fallbacks below paint the field in them.
  var body = getComputedStyle(document.body)
  var root = getComputedStyle(document.documentElement)
  function token(name, fallback) {
    var raw = body.getPropertyValue(name)
    if (raw.trim() === '') raw = root.getPropertyValue(name)
    return hexOf(raw, fallback)
  }
  var brand = token('--dsw-alias-brand-primary', '#9ece6a')
  var ink = token('--dsw-alias-label-primary', '#a9b1d6')
  var bg = token('--dsw-alias-bg-base', '#1a1b26')
  // The site's field inks run from a barely-there dim to a crest of near-ink
  // white; the same ramp falls out of the theme's brand and text colors.
  return {
    dim: mix(bg, brand, 0.34),
    mid: mix(bg, brand, 0.62),
    lit: brand,
    hover: mix(brand, ink, 0.35),
    crest: mix(brand, ink, 0.68),
  }
}

/**
 * Any CSS color as `#rrggbb`.
 *
 * A registered OmaThemes theme hands back the hex it was built from, but the
 * built-in light/dark themes' tokens are not hex, and a custom property
 * reads back exactly what it was declared as. An off-screen probe lets the
 * engine resolve whatever that is to an `rgb()` triple.
 */
var probe = null
function hexOf(value, fallback) {
  var raw = String(value === undefined || value === null ? '' : value).trim()
  if (raw === '') return fallback
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return ('#' + raw[1] + raw[1] + raw[2] + raw[2] + raw[3] + raw[3]).toLowerCase()
  }
  if (probe === null) {
    probe = document.createElement('span')
    probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;visibility:hidden'
    document.body.appendChild(probe)
  }
  probe.style.color = ''
  probe.style.color = raw
  var computed = getComputedStyle(probe).color
  var m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(computed)
  if (m === null) return fallback
  var hex = '#'
  for (var i = 1; i <= 3; i += 1) {
    var part = Number(m[i]).toString(16)
    hex += part.length < 2 ? '0' + part : part
  }
  return hex
}

/** White noise into soft blobs: one LCG, two box passes, stretched back out. */
function buildNoise(seed) {
  var size = NOISE_SIZE
  var state = seed >>> 0
  function random() {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
  var field = new Float32Array(size * size)
  var i
  for (i = 0; i < field.length; i += 1) field[i] = random()
  for (var pass = 0; pass < 2; pass += 1) {
    var next = new Float32Array(size * size)
    for (var y = 0; y < size; y += 1) {
      for (var x = 0; x < size; x += 1) {
        var sum = 0
        for (var dy = -1; dy <= 1; dy += 1) {
          for (var dx = -1; dx <= 1; dx += 1) {
            sum += field[((y + dy + size) % size) * size + ((x + dx + size) % size)]
          }
        }
        next[y * size + x] = sum / 9
      }
    }
    field = next
  }
  var lo = Infinity
  var hi = -Infinity
  for (i = 0; i < field.length; i += 1) {
    if (field[i] < lo) lo = field[i]
    if (field[i] > hi) hi = field[i]
  }
  var span = hi - lo || 1
  for (i = 0; i < field.length; i += 1) field[i] = (field[i] - lo) / span
  return field
}

/** A fixed 64×64 tile of per-cell threshold offsets, tiled over the grid. */
function buildJitter(seed) {
  var state = seed >>> 0
  var tile = new Float32Array(64 * 64)
  for (var i = 0; i < tile.length; i += 1) {
    state = (state * 1664525 + 1013904223) >>> 0
    tile[i] = state / 4294967296
  }
  return tile
}

/** Bilinear sample of the noise tile, wrapping. */
function sample(field, x, y) {
  var size = NOISE_SIZE
  var xi = Math.floor(x)
  var yi = Math.floor(y)
  var fx = x - xi
  var fy = y - yi
  var x0 = ((xi % size) + size) % size
  var y0 = ((yi % size) + size) % size
  var x1 = (x0 + 1) % size
  var y1 = (y0 + 1) % size
  var sx = fx * fx * (3 - 2 * fx)
  var sy = fy * fy * (3 - 2 * fy)
  var a = field[y0 * size + x0]
  var b = field[y0 * size + x1]
  var c = field[y1 * size + x0]
  var d = field[y1 * size + x1]
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy
}

/** A press is never a control: buttons and the composer never stamp. */
function isControl(target) {
  return target instanceof Element
    && target.closest('a,button,input,select,textarea,label,[role="button"],[contenteditable="true"]') !== null
}

/**
 * One field on one host, for as long as that host is the New Session hero.
 * @param host - the conversation root, in its `hero` phase.
 * @param live - whether the pointer may light and stamp (mode `interactive`).
 * @returns disposer taking the canvas and every listener back out.
 */
function mountField(host, live) {
  var canvas = document.createElement('canvas')
  canvas.className = 'omapixel-field'
  canvas.setAttribute('aria-hidden', 'true')
  host.classList.add('omapixel-field-host')
  host.insertBefore(canvas, host.firstChild)
  var g = canvas.getContext('2d')
  if (g === null) {
    return function () {
      host.classList.remove('omapixel-field-host')
      canvas.remove()
    }
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  var noise = buildNoise(0x9ece6a)
  var jitter = buildJitter(0x0a1f14)
  var palette = fieldPalette()

  var dpr = 1
  var width = 0
  var height = 0
  var cell = 8
  // The lattice starts at originX horizontally — centred on the composer
  // column — and at the canvas top vertically. Nothing is clipped: the whole
  // canvas is a field, and the ramp alone decides where it is dark.
  var originX = 0
  var cols = 0
  var rows = 0
  var ramp = new Float32Array(0)

  var pointer = { x: -1e7, y: -1e7 }
  var strength = 0
  var targetStrength = 0
  var pings = []
  var holding = null

  /** Cells per noise unit → the same blob size however big the field is. */
  function measure() {
    var box = host.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return false
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    var nextW = Math.round(box.width * dpr)
    var nextH = Math.round(box.height * dpr)
    // Assigning canvas.width wipes the buffer: only do it when it changed.
    if (nextW !== width || nextH !== height) {
      width = nextW
      height = nextH
      canvas.width = width
      canvas.height = height
    }

    // The composer column is no longer a clip — it is where the clear oval is
    // centred, so the hero's copy keeps its quiet.
    var seat = host.querySelector('[data-composer-seat]')
    var headline = host.querySelector('[class*="headline"]')
    var anchor = seat !== null ? seat : headline
    var ab = anchor !== null ? anchor.getBoundingClientRect() : box
    var cx = Math.min(width - 4, Math.max(4, (ab.left + ab.width / 2 - box.left) * dpr))

    // The site has no fixed cell either: one cell is the wordmark slot over
    // its 81 columns, so the lattice coarsens and tightens with the panel.
    var slot = Math.min(SLOT_FRACTION * (box.width - SLOT_INSET), SLOT_MAX)
    if (!(slot > 0)) slot = box.width
    cell = Math.max(CELL_MIN_CSS, Math.round((slot * dpr) / GRID_CELLS))
    cols = Math.max(1, Math.ceil(width / cell))
    rows = Math.max(1, Math.ceil(height / cell))
    originX = cx - (cols * cell) / 2

    // The site's ramp, unaltered: each axis normalized against its own
    // half-extent, the eased oval, and the gradient that keeps the top of the
    // field at 16 %. Half-width normalization on both axes reached full
    // density far too early over a panel this tall.
    ramp = new Float32Array(cols * rows)
    var halfW = width / 2
    var halfH = height / 2
    for (var row = 0; row < rows; row += 1) {
      var y = (row + 0.5) * cell
      var ny = (y - halfH) / halfH
      var clear = Math.min(1, Math.max(RAMP_FLOOR, (y / dpr - RAMP_TOP_PX) / RAMP_FADE_PX))
      for (var col = 0; col < cols; col += 1) {
        var x = originX + (col + 0.5) * cell
        var nx = (x - cx) / halfW
        var rr = Math.sqrt(nx * nx + ny * ny * RAMP_Y_SCALE)
        var eased = Math.min(1, Math.max(0, (rr - RAMP_INNER) / RAMP_SPAN))
        ramp[row * cols + col] = eased * eased * clear
      }
    }
    return true
  }

  /** How far a held press has charged, 0..1. */
  function chargeOf(now, start) {
    return Math.min((now - start) / 1000 / CHARGE_TIME, 1)
  }

  /** Release a stamp: the mark grows from under a cell to a few of them. */
  function launch(x, y, charge, now) {
    var from = CHARGE_FROM + CHARGE_GROWTH * charge
    pings = pings.slice(-3).concat({
      x: x, y: y, born: now, from: from,
      to: (from + 1 + 3.2 * charge) * (0.92 + Math.random() * 0.16),
      life: (0.65 + 0.55 * charge) * (0.92 + Math.random() * 0.16),
    })
  }

  function draw(time) {
    var t = reduced ? 0 : time / 1000
    strength += (targetStrength - strength) * 0.3

    g.clearRect(0, 0, width, height)

    var glows = []
    if (live && strength > 0.01) {
      glows.push({ x: pointer.x, y: pointer.y, s: strength, reach: CURSOR_CELLS * cell * (0.45 + 0.55 * strength) })
    }

    var stamps = []
    if (live && pings.length > 0) {
      pings = pings.filter(function (ping) { return (time - ping.born) / 1000 < ping.life })
      for (var p = 0; p < pings.length; p += 1) {
        var ping = pings[p]
        var age = (time - ping.born) / 1000 / ping.life
        var grow = 1 - Math.pow(1 - age, 3)
        stamps.push({
          x: ping.x, y: ping.y,
          cellPx: cell * (ping.from + (ping.to - ping.from) * grow),
          amp: Math.pow(1 - age, 1.7),
        })
      }
    }
    if (live && holding !== null) {
      stamps.push({
        x: holding.x, y: holding.y,
        cellPx: cell * (CHARGE_FROM + CHARGE_GROWTH * chargeOf(time, holding.start)),
        amp: 0.9,
      })
    }

    /** The strongest stamp covering a device-px point, if any. */
    function stampAt(px, py) {
      var amp = 0
      for (var s = 0; s < stamps.length; s += 1) {
        var stamp = stamps[s]
        var lx = Math.floor((px - stamp.x) / stamp.cellPx + LOGO_SIZE / 2)
        var ly = Math.floor((py - stamp.y) / stamp.cellPx + LOGO_SIZE / 2)
        if (lx < 0 || ly < 0 || lx >= LOGO_SIZE || ly >= LOGO_SIZE) continue
        if (LOGO_ROWS[ly][lx] === '1' && stamp.amp > amp) amp = stamp.amp
      }
      return amp
    }

    for (var row = 0; row < rows; row += 1) {
      var yTop = row * cell
      var y = Math.round(yTop)
      var cellH = Math.round(yTop + cell) - y
      var cy = yTop + cell / 2
      for (var col = 0; col < cols; col += 1) {
        var xLeft = originX + col * cell
        var shade = ramp[row * cols + col]
        var lum = 0
        if (shade > 0.002) {
          var u = col / CELLS_PER_NOISE
          var v = row / CELLS_PER_NOISE
          var base = 0.6 * sample(noise, u + t * 0.14, v - t * 0.055)
            + 0.4 * sample(noise, u * 0.55 - t * 0.08, v * 0.55 + t * 0.06)
          var twinkle = 0.5 + 0.5 * Math.sin(
            t * 1.1 + jitter[((row * 37 + col * 11) & 4095)] * 6.283,
          )
          // The site's own gain. It was trimmed to 0.55 only to fight the
          // too-open ramp; with the ramp ported, the trim has nothing left to
          // pay for, and the cursor's disc never passes through this term.
          lum = shade * (0.3 + 0.52 * base * base + 0.18 * twinkle) * 0.62
        }

        var cxp = xLeft + cell / 2
        var glowAmount = 0
        for (var gi = 0; gi < glows.length; gi += 1) {
          var glow = glows[gi]
          var dx = cxp - glow.x
          var dy = cy - glow.y
          var dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < glow.reach) {
            var falloff = 1 - dist / glow.reach
            var amount = falloff * falloff * glow.s
            if (amount > glowAmount) glowAmount = amount
          }
        }
        lum += glowAmount * 0.6

        var waveAmount = 0
        if (stamps.length > 0) {
          waveAmount = stampAt(cxp, cy)
          lum += waveAmount * 1.15
        }

        // Bayer alone would light the same low-index cells everywhere and
        // read as a regular lattice, so a fixed per-cell offset scatters the
        // resting field while the ordered structure still shows where the
        // cursor or a stamp pushes luminance high.
        var threshold = 0.78 * ((BAYER[((row & 7) * 8) + (col & 7)] + 0.5) / 64)
          + 0.22 * jitter[(row & 63) * 64 + (col & 63)]
        if (lum <= threshold) continue

        var heat = glowAmount > waveAmount ? glowAmount : waveAmount
        g.fillStyle = heat > 0.75
          ? palette.crest
          : heat > 0.34
            ? palette.lit
            : heat > 0.1 ? palette.mid : palette.dim
        var x = Math.round(xLeft)
        g.fillRect(x, y, Math.round(xLeft + cell) - x, cellH)
      }
    }
  }

  var frame = 0
  var lastDraw = 0
  function loop(now) {
    frame = requestAnimationFrame(loop)
    if (now - lastDraw < FRAME_MS) return
    lastDraw = now
    draw(now)
  }

  /** Pointer position in canvas device px, plus whether it is on the host. */
  function locate(event) {
    var box = host.getBoundingClientRect()
    return {
      inside: event.clientX >= box.left && event.clientX <= box.right
        && event.clientY >= box.top && event.clientY <= box.bottom,
      x: (event.clientX - box.left) * dpr,
      y: (event.clientY - box.top) * dpr,
    }
  }

  function onPointerMove(event) {
    if (!live || reduced) return
    var at = locate(event)
    if (!holding) targetStrength = at.inside ? 1 : 0
    if (!at.inside) return
    pointer.x = at.x
    pointer.y = at.y
  }

  function onPointerDown(event) {
    if (!live || reduced) return
    var at = locate(event)
    if (!at.inside) return
    pointer.x = at.x
    pointer.y = at.y
    if (isControl(event.target)) return
    targetStrength = 0
    holding = { x: at.x, y: at.y, start: performance.now() }
  }

  function onPointerUp(event) {
    if (!live || holding === null) return
    if (finePointer) targetStrength = locate(event).inside ? 1 : 0
    var now = performance.now()
    launch(holding.x, holding.y, chargeOf(now, holding.start), now)
    holding = null
  }

  // Losing the pointer, or a right-click over a held press, cancels the
  // charge rather than firing it.
  function onCancel() { holding = null }

  // A host with no box yet (mounted before layout) cannot be measured, but the
  // loop still starts: it no-ops on a zero-size canvas and picks the field up
  // as soon as the panel has one, where waiting for a resize would leave a
  // single frozen frame.
  measure()
  if (reduced) draw(0)
  else frame = requestAnimationFrame(loop)

  var observers = []
  if (typeof ResizeObserver !== 'undefined') {
    var resize = new ResizeObserver(function () {
      if (!measure()) return
      // Repaint in the same tick: waiting for the throttled frame would
      // leave a just-cleared buffer on screen mid-resize.
      draw(reduced ? 0 : lastDraw)
    })
    resize.observe(host)
    observers.push(resize)
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('pointerup', onPointerUp, { passive: true })
  window.addEventListener('pointercancel', onCancel, { passive: true })
  window.addEventListener('contextmenu', onCancel, { passive: true })

  return function () {
    cancelAnimationFrame(frame)
    for (var i = 0; i < observers.length; i += 1) observers[i].disconnect()
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('contextmenu', onCancel)
    host.classList.remove('omapixel-field-host')
    canvas.remove()
    if (probe !== null) { probe.remove(); probe = null }
  }
}

/* ── The headline typewriter ──────────────────────────────────────────
 *
 * The site's `TypewriterTail` ports whole: the same rhythm, the same shared
 * front, the same height reservation. The one translation is where the
 * prefix lives. The site renders a static "We can fix every" and types only
 * the tail, so deleting can stop at zero; here every phrase is complete, and
 * `shared` stops the deletion at the front the current phrase and the next
 * share — which, for the four hero phrases, is exactly "We can fix every".
 * ───────────────────────────────────────────────────────────────────── */

/** Base milliseconds per keystroke, plus up to this much again at random. */
var KEY_MS = 58
var KEY_JITTER = 60
var WORD_PAUSE = 95
var ENDING_PAUSE = 70
/** How often a keystroke catches, and for how long. */
var HESITATE_ODDS = 0.07
var HESITATE_MS = 140
var DELETE_MS = 27
var HOLD_MS = 2100
var TURN_MS = 420

/**
 * Run the rotation on one headline span.
 * @param el - the shipped title span itself; its text is owned while running.
 * @param phrases - whole phrases, typed in rotation from a random one.
 * @param reduced - show one phrase instead of animating.
 * @returns disposer putting the product's own text back.
 */
function mountTyper(el, phrases, reduced) {
  var block = el.parentElement
  var own = el.textContent
  var height = block !== null ? block.style.minHeight : ''
  var still = reduced || phrases.length < 2

  function restore() {
    el.textContent = own
    if (block !== null) block.style.minHeight = height
    el.removeAttribute('data-omap-typing')
  }

  if (still) {
    el.textContent = phrases[Math.floor(Math.random() * phrases.length)]
    return restore
  }

  /** Holds the block at its tallest phrase, so no phrase can resize it. */
  function reserve() {
    if (block === null) return
    var before = el.textContent
    block.style.minHeight = ''
    var tallest = 0
    for (var i = 0; i < phrases.length; i += 1) {
      el.textContent = phrases[i]
      var h = block.getBoundingClientRect().height
      if (h > tallest) tallest = h
    }
    el.textContent = before
    block.style.minHeight = Math.ceil(tallest) + 'px'
  }

  /** How much of the front of these two the reader would not see change. */
  function shared(a, b) {
    var i = 0
    while (i < a.length && i < b.length && a.charAt(i) === b.charAt(i)) i += 1
    return i
  }

  var index = Math.floor(Math.random() * phrases.length)
  var length = 0
  var deleting = false
  var timer = 0

  function wait() {
    var phrase = phrases[index]
    if (deleting) return DELETE_MS
    var ms = KEY_MS + Math.random() * KEY_JITTER
    if (phrase.charAt(length - 1) === ' ') ms += WORD_PAUSE
    if (length >= phrase.length - 2) ms += ENDING_PAUSE
    if (Math.random() < HESITATE_ODDS) ms += HESITATE_MS
    return ms
  }

  function step() {
    var phrase = phrases[index]
    el.textContent = phrase.slice(0, length)

    var next = wait()
    var onward = (index + 1) % phrases.length
    if (!deleting && length === phrase.length) {
      deleting = true
      next = HOLD_MS
    } else if (deleting && length === shared(phrase, phrases[onward])) {
      deleting = false
      index = onward
      next = TURN_MS
    } else {
      length += deleting ? -1 : 1
    }

    // The caret blinks only at the ends, never mid-word, as on the site.
    el.setAttribute('data-omap-typing', next > HOLD_MS - 1 || next === TURN_MS ? '0' : '1')
    timer = window.setTimeout(step, next)
  }

  // Measure against the real webfont, or the reservation is a fallback's. The
  // font load can settle after the typer was stopped — a mode switch or a hero
  // remount — and re-reserving then would rewrite the product's own hero block
  // from under the next mount, so the callback checks a flag the disposer flips.
  var stopped = false
  reserve()
  if (document.fonts !== undefined && document.fonts.ready !== undefined) {
    document.fonts.ready.then(function () { if (!stopped) reserve() })
  }
  step()

  return function () {
    stopped = true
    window.clearTimeout(timer)
    restore()
  }
}

var CSS = [
  // The host has to hold a stacking context for its own `z-index:-1` child:
  // without one, the negative cell paints against an ancestor's context and
  // lands behind the panel's own background — a field nobody can see.
  '.omapixel-field-host{isolation:isolate}',
  '.omapixel-field{position:absolute;inset:0;z-index:-1;display:block;width:100%;height:100%;',
  'pointer-events:none;user-select:none}',
  '.omapixel{display:flex;flex-direction:column;gap:20px;max-width:1000px}',
  '.omapixel-title{font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary)}',
  '.omapixel-note{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary);max-width:62ch}',
  '.omapixel-setting{display:flex;flex-direction:column;gap:8px}',
  '.omapixel-line{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}',
  '.omapixel-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
  '.omapixel-chip{font:inherit;font-size:12px;padding:4px 12px;border-radius:999px;cursor:pointer;',
  'border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary)}',
  '.omapixel-chip:hover{background:var(--dsw-alias-bg-layer-2)}',
  '.omapixel-chip[data-on="1"]{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);border-color:transparent}',
  '.omapixel-legend{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
  // The loop mode's caret: an inline block that walks with the typed text,
  // solid while typing and blinking only at a phrase's end. The attribute is
  // set by the typewriter alone, so the sheet and the once mode ignore it.
  '[data-omap-typing]::after{content:"";display:inline-block;width:3px;height:1.05em;',
  'margin-left:2px;vertical-align:text-bottom;background:var(--dsw-alias-brand-primary)}',
  '@media (prefers-reduced-motion: no-preference){',
  '[data-omap-typing="0"]::after{animation:omap-caret 1.06s step-end infinite}}',
  '@keyframes omap-caret{0%,50%{opacity:1}50.01%,100%{opacity:0}}',
].join('\n')

function applyFeature(host) {
  // The feature attaches when its services exist: the page's plugin tree is
  // still assembling while this apply runs, so a plain `ctx.get` here would
  // read an empty tree and the section would never appear.
  host.inject(['slots'], function (ctx) {
  var slots = ctx.get('slots')
  if (slots === undefined) return

  // Remembered per reader rather than per page load: these are choices somebody
  // made on purpose, and a field that switches itself back on after a reload is
  // the surprise. The defaults below are what a reader who has never touched
  // them gets.
  var state = loadState()
  var notifier = createNotifier()
  var notify = notifier.notify
  var subscribe = notifier.subscribe

  /** One of `modes`, or `fallback` when the stored value names none of them. */
  function modeOf(modes, value, fallback) {
    return modes.indexOf(value) >= 0 ? value : fallback
  }

  /** The two switches as they were last left, or their defaults. */
  function loadState() {
    var stored = {}
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY)
      var parsed = raw === null ? null : JSON.parse(raw)
      if (parsed !== null && typeof parsed === 'object') stored = parsed
    } catch (unavailable) {
      // Private mode, or storage denied: the switches still work for this page,
      // they just cannot be remembered across reloads.
    }
    return {
      field: modeOf(FIELD_MODES, stored.field, 'interactive'),
      typing: modeOf(TYPE_MODES, stored.typing, 'loop'),
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (unavailable) {
      // A choice that cannot be written is not an error.
    }
  }

  // The hero field is chrome: it belongs to whatever element is currently
  // the New Session hero, not to the Settings page that switches it.
  // One field at a time, on one host.
  var fieldOff = null
  var fieldHost = null
  /** Whether the field now mounted is the interactive one. */
  var fieldLive = false

  /** The conversation root, and only while it is showing the hero. */
  function heroHost() {
    if (typeof document === 'undefined') return null
    var root = document.querySelector('[data-phase="hero"]')
    if (root === null) return null
    // A root in the hero phase with no headline in it yet is not a host.
    return root.querySelector('[class*="titleGroup"]') === null ? null : root
  }

  /** Mount the field on the hero now showing, or take it off. */
  function syncField() {
    var host = state.field === 'off' ? null : heroHost()
    var live = state.field === 'interactive'
    // Ambient and Interactive are one field with different ears, so a switch
    // between them is a remount. Without the mode in this test the field kept
    // the ears it was born with until the page was reloaded.
    if (host === fieldHost && fieldOff !== null && live === fieldLive) return
    if (fieldOff !== null) { fieldOff(); fieldOff = null; fieldHost = null }
    if (host === null) return
    fieldHost = host
    fieldLive = live
    fieldOff = mountField(host, live)
  }

  function setFieldMode(mode) {
    state.field = mode
    saveState()
    syncField()
    notify()
  }

  // The headline: `loop` is the site's rotation on the shipped span, and
  // `once` is the one-shot sheet — a random phrase per run, typed once.
  var reducedMotion = false
  if (typeof window !== 'undefined' && window.matchMedia !== undefined) {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
  var runPhrase = HERO_PHRASES[Math.floor(Math.random() * HERO_PHRASES.length)]

  var sheetOff = null
  var typerOff = null
  var typerEl = null

  /** Put in or take out the one-shot sheet the `once` mode paints with. */
  function syncSheet() {
    var want = state.typing === 'once'
    if (want === (sheetOff !== null)) return
    if (sheetOff !== null) { sheetOff(); sheetOff = null }
    if (want) sheetOff = insertSheet(heroSheet(runPhrase), 'omapixel:hero-sheet')
  }

  /** Run or stop the rotation on the headline now showing, if any. */
  function syncTyper() {
    var el = null
    if (state.typing === 'loop' && typeof document !== 'undefined') {
      var root = document.querySelector('[data-phase="hero"]')
      if (root !== null) el = root.querySelector(TITLE_SELECTOR)
    }
    if (el === typerEl && typerOff !== null) return
    if (typerOff !== null) { typerOff(); typerOff = null; typerEl = null }
    if (el === null) return
    typerEl = el
    typerOff = mountTyper(el, HERO_PHRASES, reducedMotion)
  }

  function setTypingMode(mode) {
    state.typing = mode
    saveState()
    syncSheet()
    syncTyper()
    notify()
  }

  ctx.effect(function () {
    if (typeof document === 'undefined') return function () {}
    // The hero comes and goes with the route and with the first message,
    // so the field follows the DOM rather than a list of lifecycle hooks.
    // Mutations are coalesced into one check per frame.
    var queued = false
    var pending = 0
    var live = true
    function check() {
      if (queued) return
      queued = true
      if (typeof requestAnimationFrame !== 'function') { queued = false; syncField(); syncTyper(); return }
      pending = requestAnimationFrame(function () {
        queued = false
        // Effects dispose in reverse order, so this callback can still be in
        // flight after the teardown effect released the field: running it then
        // would mount a second canvas and its listeners on a stopped plugin.
        if (!live) return
        syncField()
        syncTyper()
      })
    }
    var watcher = null
    if (typeof MutationObserver !== 'undefined') {
      watcher = new MutationObserver(check)
      watcher.observe(document.body, {
        childList: true, subtree: true, attributes: true, attributeFilter: ['data-phase'],
      })
    }
    check()
    return function () {
      live = false
      if (pending !== 0) cancelAnimationFrame(pending)
      if (watcher !== null) watcher.disconnect()
    }
  }, 'omapixel: hero field')

  ctx.effect(function () {
    // A theme swap changes the field's inks: remount, which re-reads them.
    // This is the whole seam to OmaThemes — the field simply follows whatever
    // palette the page carries, and works unchanged when OmaThemes is absent.
    return ctx.on('theme/change', function () { fieldHost = null; syncField() })
  }, 'omapixel: field palette')

  ctx.effect(function () {
    return function () {
      if (fieldOff !== null) { fieldOff(); fieldOff = null; fieldHost = null }
      if (typerOff !== null) { typerOff(); typerOff = null; typerEl = null }
      if (sheetOff !== null) { sheetOff(); sheetOff = null }
    }
  }, 'omapixel: teardown')

  ctx.effect(function () { return insertSheet(CSS, 'omapixel:base') }, 'omapixel: styles')
  ctx.effect(function () {
    // Both headline modes start with whatever hero is up, and the observer
    // above re-runs them as heroes come and go.
    syncSheet()
    syncTyper()
  }, 'omapixel: headline')

  function HeroPage() {
    var tick = React.useState(0)
    // Functional update: the subscription outlives the render that created it.
    var bump = function () { tick[1](function (n) { return n + 1 }) }
    React.useEffect(function () {
      var off = subscribe(bump)
      return function () { off() }
    }, [])

    return h('div', { className: 'omapixel' },
      h('div', null, h('div', { className: 'omapixel-title' }, 'OmaPixel')),
      h('div', { className: 'omapixel-setting' },
        h('div', { className: 'omapixel-line' },
          h('span', { className: 'omapixel-legend' }, 'Pixel field:'),
          h('span', { className: 'omapixel-note' },
            'The cool pixel animations from omarchy.org, on the New Session hero')),
        h('div', { className: 'omapixel-row' },
          FIELD_MODES.map(function (mode) {
            return h('button', {
              key: mode,
              className: 'omapixel-chip',
              type: 'button',
              'data-on': state.field === mode ? '1' : '0',
              onClick: function () { setFieldMode(mode) },
            }, FIELD_LABELS[mode])
          }))),
      h('div', { className: 'omapixel-setting' },
        h('div', { className: 'omapixel-line' },
          h('span', { className: 'omapixel-legend' }, 'Headline:'),
          h('span', { className: 'omapixel-note' },
            'Types omarchy.org\'s headline rotation: loop forever or just play once.')),
        h('div', { className: 'omapixel-row' },
          TYPE_MODES.map(function (mode) {
            return h('button', {
              key: mode,
              className: 'omapixel-chip',
              type: 'button',
              'data-on': state.typing === mode ? '1' : '0',
              onClick: function () { setTypingMode(mode) },
            }, TYPE_LABELS[mode])
          }))))
  }

  ctx.effect(function () {
    return slots.inject('settings.section', function () {
      return slots.register(
        { name: 'settings.section', id: 'omapixel', order: 13, label: 'OmaPixel' },
        HeroPage,
      )
    })
  }, 'omapixel: settings page')
  })
}

exports["applyFeature"] = applyFeature
	};
	__defs["client.js"] = (module, exports, __req) => {
/**
 * The `omaseek-pixel` browser half.
 *
 * One package is one browser plugin — the client-module system mounts a browser
 * half by its package's bare name, and a row carries no more than that — so each
 * feature owns its entry, its bundle and its row on the Plugins page.
 */

const applyPixel = __req("client/pixel.js").applyFeature

function apply(ctx) {
  applyPixel(ctx)
}

exports["apply"] = apply
	};
	const __entry = __req("client.js");
	if (typeof __entry.apply !== "function") {
		throw new Error("omaseek-pixel: client entry exports no apply()");
	}
	for (const key of Object.keys(__entry)) exports[key] = __entry[key];
	return module.exports;
	},
});
