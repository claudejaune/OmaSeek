/**
 * OmaSeek — Omarchy home-page themes for DeepSeek Harness. Client half.
 *
 * Registers all 22 Omarchy home-page themes with the `theme` Service, then
 * contributes a Settings page listing only the themes belonging to the color
 * scheme currently in force — the five light palettes while the app is light,
 * the seventeen dark ones while it is dark. That filtering is the whole
 * design: a registered theme declares exactly one `colorScheme`, so a dark
 * palette is never offered over a light UI. The page also switches corner
 * shape, and Square is on from the moment the Plugin loads. The New Session
 * hero swaps its headline for one of the four OmaSeek phrases, typed letter
 * by letter once per hero mount, and sits in the omarchy.org hero's pixel
 * field: a dithered lattice that drifts behind the composer column, lights
 * under the cursor, and takes a press by stamping the Omarchy mark out of
 * the click point.
 *
 * The palettes themselves arrive from this Package's Host half, which parses
 * them out of the research doc; only the derived tokens are computed here.
 *
 * Plain JavaScript only (no import/require/JSX/TS).
 */

/** Token this theme paints the user (and steering) bubble with. */
var BUBBLE = '--dsw-specific-bubble'

/**
 * Blend two colors: `amount` of `to` over `from`, as `#rrggbb`.
 * Omarchy tints the user bubble with brand at 12.15 % over the app background;
 * the same math gives every derived surface below a consistent step.
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

var NAMED = { silver: 'c0c0c0', white: 'ffffff', black: '000000', gray: '808080', grey: '808080' }

/** Parse a hex or the handful of CSS names the source tables use. */
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
 * What the New Session hero's pixel field does.
 * `off` runs nothing at all; `ambient` is the drifting lattice on its own;
 * `interactive` adds cursor glow and press-to-stamp interaction.
 */
var FIELD_MODES = ['off', 'ambient', 'interactive']
var FIELD_LABELS = { off: 'Off', ambient: 'Ambient', interactive: 'Interactive' }

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
  // The shipped title span; the sibling badge is told apart by its class.
  var title = '[class*="titleGroup"] > span:not([class*="previewBadge"])'
  return [
    title + '{position:relative;font-size:0}',
    title + '::after{content:"' + phrase + '";display:inline-block;font-size:26px;line-height:32px;',
    'font-weight:500;white-space:pre-wrap;max-width:100%}',
    // px, not em: the host span sits at font-size 0, where em would vanish.
    '@media (prefers-reduced-motion: no-preference){',
    title + '::after{clip-path:inset(-0.1em 100% -0.2em 0);',
    'animation:omaseek-hero-type ' + ms + 'ms steps(' + len + ',end) ' + start + 'ms forwards}',
    title + '::before{content:"";position:absolute;left:0;top:50%;width:3px;height:28px;margin-top:-14px;',
    'background:var(--dsw-alias-brand-primary);',
    'animation:omaseek-hero-caret ' + ms + 'ms steps(' + len + ',end) ' + start + 'ms forwards,',
    'omaseek-hero-blink 1.06s step-end ' + (start + ms + 500) + 'ms infinite}',
    '}',
    // The overshoot past 0% keeps the last glyph's edge off the clip line.
    '@keyframes omaseek-hero-type{from{clip-path:inset(-0.1em 100% -0.2em 0)}to{clip-path:inset(-0.1em -1% -0.2em 0)}}',
    '@keyframes omaseek-hero-caret{from{left:0}to{left:100%}}',
    '@keyframes omaseek-hero-blink{0%,50%{opacity:1}50.01%,100%{opacity:0}}',
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
 * restacked, no Slot is replaced. Its width is the composer column
 * (`--dsw-composer-card-max-width`) and its height the whole panel: a column
 * of pixels the hero stands in, running to the panel's floor and header.
 * ───────────────────────────────────────────────────────────────────── */

/** Edge of one cell in CSS px. Chunky enough to read as pixels. */
var CELL_CSS = 8
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
/** Bleed past the column's sides, in cells. */
var BLEED_X = 2
/** The clear oval: nothing inside RAMP_INNER, full density past RAMP_INNER + RAMP_SPAN. */
var RAMP_INNER = 0.3
var RAMP_SPAN = 0.6

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
 * A registered OmaSeek theme hands back the hex it was built from, but the
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
  canvas.className = 'omaseek-field'
  canvas.setAttribute('aria-hidden', 'true')
  host.classList.add('omaseek-field-host')
  host.insertBefore(canvas, host.firstChild)
  var g = canvas.getContext('2d')
  if (g === null) {
    return function () {
      host.classList.remove('omaseek-field-host')
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
  // The band, in device px: cells outside it are never drawn, which is what
  // keeps the field a hero backdrop rather than a full-panel wash.
  var band = { l: 0, t: 0, r: 0, b: 0 }
  var cols = 0
  var rows = 0
  var ramp = new Float32Array(0)

  var pointer = { x: -1e7, y: -1e7 }
  var strength = 0
  var targetStrength = 0
  var pings = []
  var holding = null

  /** Cells per noise unit → the same blob size however big the band is. */
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

    var headline = host.querySelector('[class*="headline"]')
    var seat = host.querySelector('[data-composer-seat]')
    var hb = headline !== null ? headline.getBoundingClientRect() : box
    var sb = seat !== null ? seat.getBoundingClientRect() : hb
    var cardRaw = getComputedStyle(host).getPropertyValue('--dsw-composer-card-max-width')
    var card = parseFloat(cardRaw)
    if (!(card > 0)) card = Math.max(hb.width, sb.width)
    var bw = Math.min(box.width - 16, Math.max(card, hb.width))
    var cx = (sb.left + sb.width / 2 - box.left) * dpr

    // Width follows the composer column; height is the whole panel. The field
    // is a column of pixels the hero stands in, not a strip behind its copy —
    // the harness hero is a full-height centered stack, so a band cut to the
    // text would have stopped short of the panel floor and header.
    cell = Math.max(3, Math.round(CELL_CSS * dpr))
    band.l = cx - (bw * dpr) / 2 - BLEED_X * cell
    band.t = 0
    band.r = cx + (bw * dpr) / 2 + BLEED_X * cell
    band.b = height

    cols = Math.max(1, Math.ceil((band.r - band.l) / cell))
    rows = Math.max(1, Math.ceil((band.b - band.t) / cell))
    // The ramp is the site's, with one change of scale: both axes are
    // normalized against the *column's* half-width, not each against its own
    // extent. The site's hero is a wide, short box, where per-axis
    // normalization and a true circle amount to the same thing; over a
    // full-height panel, per-axis normalization pushes almost every cell's
    // radius past the shape and leaves the field dark but for its corners.
    ramp = new Float32Array(cols * rows)
    var halfW = (band.r - band.l) / 2
    var midX = (band.l + band.r) / 2
    var midY = (band.t + band.b) / 2
    for (var row = 0; row < rows; row += 1) {
      var y = band.t + (row + 0.5) * cell
      var ny = (y - midY) / halfW
      for (var col = 0; col < cols; col += 1) {
        var x = band.l + (col + 0.5) * cell
        var nx = (x - midX) / halfW
        // 0.82 on the vertical, as on the site: the clear region is a shade
        // taller than wide, which is what the hero's copy block looks like.
        var rr = Math.sqrt(nx * nx + ny * ny * 0.82)
        var eased = Math.min(1, Math.max(0, (rr - RAMP_INNER) / RAMP_SPAN))
        ramp[row * cols + col] = eased * eased
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
      var yTop = band.t + row * cell
      var y = Math.round(yTop)
      var cellH = Math.round(yTop + cell) - y
      var cy = yTop + cell / 2
      for (var col = 0; col < cols; col += 1) {
        var xLeft = band.l + col * cell
        if (xLeft < band.l - cell || xLeft > band.r) continue
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
          // 0.62 is the site's; 0.55 keeps the harness's own copy legible
          // (≈24 % of the band alight rather than ≈29 %) without dulling the
          // cursor's disc, which never passes through this term.
          lum = shade * (0.3 + 0.52 * base * base + 0.18 * twinkle) * 0.55
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

  if (measure()) {
    if (reduced) draw(0)
    else frame = requestAnimationFrame(loop)
  }

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
    host.classList.remove('omaseek-field-host')
    canvas.remove()
    if (probe !== null) { probe.remove(); probe = null }
  }
}

var CSS = [
  // The host has to hold a stacking context for its own `z-index:-1` child:
  // without one, the negative cell paints against an ancestor's context and
  // lands behind the panel's own background — a field nobody can see.
  '.omaseek-field-host{isolation:isolate}',
  '.omaseek-field{position:absolute;inset:0;z-index:-1;display:block;width:100%;height:100%;',
  'pointer-events:none;user-select:none}',
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
  // Send and stop — the site's "Get Omarchy" button scheme: brand fill,
  // brand ink glyph, hover 14 % whiter in oklch (button.tsx default variant).
  // They share the InputBar module's single `primary` class (KFmeWW_primary);
  // the hash-qualified fragment keeps the hit exact in this build — update
  // it if a harness rebuild renames the module.
  'button[class*="KFmeWW_primary"]{background:var(--dsw-alias-brand-primary);',
  'color:var(--dsw-specific-brand-ink,#fff)}',
  'button[class*="KFmeWW_primary"]:hover:not(:disabled){',
  'background:color-mix(in oklch, var(--dsw-alias-brand-primary), white 14%)}',
].join('\n')

/** createElement shorthand — this Package is not compiled, so no JSX. */
function h(type, props) {
  var children = []
  for (var i = 2; i < arguments.length; i += 1) children.push(arguments[i])
  return React.createElement.apply(null, [type, props].concat(children))
}

return {
  apply(ctx) {
    var theme = ctx.get('theme')
    var slots = ctx.get('slots')
    if (theme === undefined || slots === undefined) return

    // Package-local store: the palettes arrive asynchronously from the Host,
    // and the Settings page subscribes instead of polling.
    var state = { entries: [], error: '', loading: true, corners: 'square', field: 'interactive' }
    var subs = []
    function notify() {
      for (var i = 0; i < subs.length; i += 1) subs[i]()
    }
    function subscribe(fn) {
      subs.push(fn)
      return function () {
        var at = subs.indexOf(fn)
        if (at >= 0) subs.splice(at, 1)
      }
    }

    // Corner shape lives outside the Settings page: it restyles the whole
    // harness, so it stays applied after the page closes. One owned sheet,
    // swapped rather than stacked.
    var cornerOff = null
    function setCorners(mode) {
      if (cornerOff !== null) { cornerOff(); cornerOff = null }
      state.corners = mode
      if (CORNER_SHEET[mode] !== undefined) cornerOff = styles.insert(CORNER_SHEET[mode])
      notify()
    }
    // The Omarchy reading is the default: square the moment the Plugin loads.
    setCorners(state.corners)

    // The hero field is chrome of the same kind: it belongs to whatever
    // element is currently the New Session hero, not to the Settings page
    // that switches it. One field at a time, on one host.
    var fieldOff = null
    var fieldHost = null

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
      if (host === fieldHost && fieldOff !== null) return
      if (fieldOff !== null) { fieldOff(); fieldOff = null; fieldHost = null }
      if (host === null) return
      fieldHost = host
      fieldOff = mountField(host, state.field === 'interactive')
    }

    function setFieldMode(mode) {
      state.field = mode
      syncField()
      notify()
    }

    ctx.effect(function () {
      if (typeof document === 'undefined') return function () {}
      // The hero comes and goes with the route and with the first message,
      // so the field follows the DOM rather than a list of lifecycle hooks.
      // Mutations are coalesced into one check per frame.
      var queued = false
      function check() {
        if (queued) return
        queued = true
        if (typeof requestAnimationFrame !== 'function') { queued = false; syncField(); return }
        requestAnimationFrame(function () { queued = false; syncField() })
      }
      var watcher = null
      if (typeof MutationObserver !== 'undefined') {
        watcher = new MutationObserver(check)
        watcher.observe(document.body, {
          childList: true, subtree: true, attributes: true, attributeFilter: ['data-phase'],
        })
      }
      check()
      return function () { if (watcher !== null) watcher.disconnect() }
    }, 'omaseek: hero field')

    ctx.effect(function () {
      // A theme swap changes the field's inks: remount, which re-reads them.
      return ctx.on('theme/change', function () { fieldHost = null; syncField() })
    }, 'omaseek: field palette')

    ctx.effect(function () {
      return function () {
        if (fieldOff !== null) { fieldOff(); fieldOff = null; fieldHost = null }
      }
    }, 'omaseek: field teardown')

    ctx.effect(function () { return styles.insert(CSS) }, 'omaseek: styles')
    ctx.effect(function () {
      // One phrase per run, picked when the Plugin loads; the typing itself is
      // per hero mount, because the CSS animation restarts with the element.
      var phrase = HERO_PHRASES[Math.floor(Math.random() * HERO_PHRASES.length)]
      return styles.insert(heroSheet(phrase))
    }, 'omaseek: hero headline')
    ctx.effect(function () {
      // The style tags go with the run anyway; this disposes the corner sheet
      // on its own too, so an update that never set a corner mode is clean.
      return function () { if (cornerOff !== null) cornerOff() }
    }, 'omaseek: corner sheet')

    ctx.effect(function () {
      var live = true
      var disposers = []
      host.call('omaseek.themes').then(function (result) {
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
      // The filter rule: registered themes carry exactly one colorScheme, so
      // the list follows whatever scheme the presenter is currently painting.
      var scheme = snapshot.active.colorScheme
      var listed = state.entries.filter(function (entry) { return entry.scheme === scheme })

      function choose(entry) {
        try { theme.setTheme(entry.id) } catch (error) {
          state.error = String((error && error.message) || error)
          bump()
        }
      }
      // Leaving the Omarchy set: the built-in preferences are always available.
      function base(id) {
        try { theme.setTheme(id) } catch (error) {
          state.error = String((error && error.message) || error)
          bump()
        }
      }

      var children = [
        h('div', { key: 'head' }, h('div', { className: 'omaseek-title' }, 'OmaSeek')),
      ]

      if (state.error !== '') {
        children.push(h('div', { key: 'err', className: 'omaseek-error' }, state.error))
      }

      children.push(h('div', { key: 'corners', className: 'omaseek-row' },
        h('span', { className: 'omaseek-legend' }, 'Corners'),
        ['squircle', 'square'].map(function (mode) {
          return h('button', {
            key: mode,
            className: 'omaseek-chip',
            type: 'button',
            'data-on': state.corners === mode ? '1' : '0',
            onClick: function () { setCorners(mode) },
          }, CORNER_LABELS[mode])
        })))

      // Purely a feature notice: hidden by the CSS, revealed only where
      // corner-shape is missing and the choice therefore does nothing.
      children.push(h('div', { key: 'corner-warn', className: 'omaseek-warn' },
        'This browser has no corner-shape (Chrome or Edge 139+), so the corner setting'
        + ' has no effect here. DeepSeek Harness ships the same guard for its own'
        + ' superellipse corners.'))

      children.push(h('div', { key: 'field', className: 'omaseek-row' },
        h('span', { className: 'omaseek-legend' }, 'Pixel field'),
        FIELD_MODES.map(function (mode) {
          return h('button', {
            key: mode,
            className: 'omaseek-chip',
            type: 'button',
            'data-on': state.field === mode ? '1' : '0',
            onClick: function () { setFieldMode(mode) },
          }, FIELD_LABELS[mode])
        })))

      children.push(h('div', { key: 'base', className: 'omaseek-row' },
        h('span', { className: 'omaseek-legend' }, 'Scheme'),
        h('button', { className: 'omaseek-chip', type: 'button', 'data-on': scheme === 'light' ? '1' : '0', onClick: function () { base('light') } }, 'Light'),
        h('button', { className: 'omaseek-chip', type: 'button', 'data-on': scheme === 'dark' ? '1' : '0', onClick: function () { base('dark') } }, 'Dark'),
        h('button', { className: 'omaseek-chip', type: 'button', 'data-on': snapshot.preference === 'system' ? '1' : '0', onClick: function () { base('system') } }, 'System')))

      children.push(h('div', { key: 'legend', className: 'omaseek-row' },
        h('span', { className: 'omaseek-legend' }, scheme === 'light' ? 'Light themes' : 'Dark themes'),
        h('span', { className: 'omaseek-count' }, state.loading
          ? 'loading palettes\u2026'
          : listed.length + (scheme === 'light' ? ' of 5' : ' of 17'))))

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
          { name: 'settings.section', id: 'omarchy-themes', order: 12, label: 'OmaSeek' },
          ThemePage,
        )
      })
    }, 'omaseek: settings page')
  },
}
