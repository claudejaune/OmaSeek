window.__ModuleLoader__.load({
	id: "omaseek",
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
	__defs["client/dom.js"] = (module, exports, __req) => {
/**
 * The two seams every OmaSeek browser feature shares.
 *
 * A dynamic Cordis package gets `styles.insert(css)` and `host.call(method)`
 * handed to it by the evaluator. An installed package gets neither: its
 * browser half is a plain module in the page, and its Node half is a plain
 * plugin in the harness. So the sheet goes in the way the shipped plugins do
 * — a tagged `<style>` the plugin owns and removes — and the call goes over
 * the same authenticated `/api/*` bridge the shell uses for its own data.
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
 * The few things all three browser features build with.
 *
 * They began life as three separate dynamic packages, each carrying its own
 * copy of these — the same seven-line `h`, the same listener list. Nothing in
 * that duplication was load-bearing, so it lives here once.
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
	__defs["client/music.js"] = (module, exports, __req) => {
/**
 * OmaMusic — the Omarchy site's music card as a floating Player. Client half.
 *
 * The same card omarchy.org docks to the viewport's bottom-left corner,
 * rebuilt on the harness and set loose: it floats above everything through
 * `shell.overlay`, and a drag anywhere but the seek line moves it. It is
 * otherwise the site's player, not a homage — the state machine, the silent
 * clock that keeps the meter and the progress line moving before the sound
 * is ever asked for, the analysed-timeline bands while paused, the live
 * Web-Audio read when it is playing, the seek whose handle is just the end
 * of the painted line, the brand ring pulsing on the untouched art: all
 * ported from `src/lib/music.ts` and `MusicControl.tsx` of the site's own
 * sources. The transport glyph is from radio.omarchy.org's bitmap icon set,
 * kept at `assets/icons/transport.json` and served by the Node half — play,
 * always shown when paused; pause, hidden while playing and lifted by hover
 * — and unlike the site's volume fade this card pauses the track for real.
 * The meter, too, is a switch of its own: a click holds the bars frozen,
 * sound and progress carrying on regardless.
 *
 * The bytes arrive from this package's Node half over `/api/omaseek.music.*`:
 * metadata, the art and the timeline in one call, the MP3 as raw windows
 * stitched into a Blob URL — no base64 hop, so the third the old JSON channel
 * spent on encoding is spent on the track. Browsers will not autoplay sound
 * without a gesture, so the card starts paused — ring pulsing, one click from
 * the sound.
 *
 * Plain JavaScript ESM, because `build/bundle-client.mjs` rewrites it into the
 * page's closure factory: `react` comes off the module table the shell seeds,
 * and every other module is relative to this directory. No JSX.
 */

const React = __req("react")
const fetchJson = __req("client/dom.js").fetchJson
const insertSheet = __req("client/dom.js").insertSheet
const createNotifier = __req("client/ui.js").createNotifier
const h = __req("client/ui.js").h

/** Fallback identity; the Node half serves the same strings. */
var TRACK = {
  title: 'We Can Fix Everything (The Ultimate Machine)',
  artist: 'Kevin Koontz',
}

/* Ported analysis constants — src/lib/music.ts of the site. */
var BANDS = 32
var LOW_HZ = 50
var HIGH_HZ = 10000
var FFT_SIZE = 2048
var DB_FLOOR = -90
var LIVE_GAIN = 0.9
var MUTED_GAIN = 0.6
var METER_BARS = 4
var METER_STEPS = 5

/**
 * The card's title budget, in characters — the width the site's card gets
 * by stripping its parenthetical suffix. Longer titles are cut back to the
 * last whole word and ellipsised; the full name lives in the hover tooltip.
 */
var TITLE_MAX = 25
function shortTitle(title) {
  if (title.length <= TITLE_MAX) return title
  var cut = title.slice(0, TITLE_MAX)
  var sp = cut.lastIndexOf(' ')
  if (sp > 12) cut = cut.slice(0, sp)
  return cut.replace(/[\s(]+$/, '') + '\u2026'
}

/** `m:ss` the way the site writes it. */
function clock(seconds) {
  var s = Math.max(0, Math.floor(seconds))
  var m = Math.floor(s / 60)
  var rest = String(s % 60)
  while (rest.length < 2) rest = '0' + rest
  return m + ':' + rest
}

/** Card styles, ported from the site's Tailwind classes and styles.css. */
var CSS = [
  // The overlay layer is click-through; the card opts its box back in.
  // Move cursor everywhere but the controls; the seek drags itself.
  '.omamusic{position:fixed;z-index:2147483000;display:flex;height:46px;align-items:stretch;',
  'border:1px solid var(--dsw-alias-border-l1);',
  'background:color-mix(in srgb, var(--dsw-alias-bg-base) 85%, transparent);',
  'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);',
  'pointer-events:auto;touch-action:none;user-select:none;cursor:move}',
  '.omamusic button,.omamusic input{cursor:pointer}',
  // Art button: the cover, a veil with the volume glyph, a brand ring
  // pulsing until the sound has been touched.
  '.omamusic-art{position:relative;width:44px;height:44px;flex:none;align-self:center;padding:0;',
  'border:none;border-right:1px solid var(--dsw-alias-border-l1);background:#000 center/cover no-repeat}',
  '.omamusic-ring{position:absolute;inset:-1px;pointer-events:none;border:1px solid var(--dsw-alias-brand-primary);',
  'animation:omamusic-ring 1.8s ease-in-out infinite}',
  '@keyframes omamusic-ring{0%,100%{opacity:1}50%{opacity:.3}}',
  '@media (prefers-reduced-motion: reduce){.omamusic-ring{animation:none}}',
  '.omamusic-veil{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;',
  'background:rgba(0,0,0,.45);color:#fff;transition:opacity .15s ease-out}',
  '.omamusic-veil svg{filter:drop-shadow(0 1px 2px rgba(0,0,0,.7))}',
  '.omamusic[data-on="1"] .omamusic-veil{opacity:0}',
  '.omamusic[data-on="1"]:hover .omamusic-veil,.omamusic[data-on="1"]:focus-within .omamusic-veil{opacity:1}',
  // Title over artist; hovering the seek swaps the artist for the readout.
  '.omamusic-text{display:flex;flex-direction:column;justify-content:center;padding:0 16px 0 12px;',
  'min-width:0;line-height:1.2}',
  '.omamusic-title{font-size:12px;font-weight:500;color:var(--dsw-alias-label-primary);',
  'white-space:nowrap;max-width:34ch;overflow:hidden;text-overflow:ellipsis}',
  '.omamusic-byline{position:relative;margin-top:2px;font-size:12px;color:var(--dsw-alias-label-secondary)}',
  '.omamusic-artist,.omamusic-readout{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}',
  '.omamusic-readout{position:absolute;inset:0;opacity:0;transition:opacity .15s ease-out}',
  '.omamusic-artist{transition:opacity .15s ease-out}',
  '.omamusic:has(.omamusic-seek:hover) .omamusic-artist,.omamusic:has(.omamusic-seek:active) .omamusic-artist,',
  '.omamusic:has(.omamusic-seek:focus-visible) .omamusic-artist{opacity:0}',
  '.omamusic:has(.omamusic-seek:hover) .omamusic-readout,.omamusic:has(.omamusic-seek:active) .omamusic-readout,',
  '.omamusic:has(.omamusic-seek:focus-visible) .omamusic-readout{opacity:1}',
  // The four-level meter, brand-colored, driven per frame outside React.
  // It is also the visualization's switch: a click holds the bars where
  // they are, a second lets them run again. The padding is the switch's
  // roomy hit area, pulled back by an equal negative margin so the bars
  // sit exactly where the bare span used to. A <button> is border-box by
  // the UA default — unlike the span it replaced, it would swallow this
  // padding into the 18px width and spill the unshrinkable bars past the
  // card's right edge, so the width is put back on the content box.
  '.omamusic-meter{display:flex;align-items:flex-end;gap:2px;box-sizing:content-box;',
  'width:18px;height:12px;flex:none;',
  'align-self:center;position:relative;padding:10px 12px 10px 10px;margin:-10px 0 -10px -10px;',
  'border:none;background:transparent;border-radius:4px}',
  '.omamusic-meter:hover{background:rgba(128,128,128,.12)}',
  '.omamusic-bar{display:block;width:3px;flex:none;height:2px;background:var(--dsw-alias-brand-primary)}',
  // The switch's own tooltip, hung over the meter: a second of hover
  // before it fades up, and it says which way the next click goes.
  '.omamusic-viz-tip{position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);',
  'padding:6px 8px;border:1px solid var(--dsw-alias-border-l1);',
  'background:var(--dsw-specific-tip, var(--dsw-alias-bg-overlay));',
  'box-shadow:0 4px 16px rgba(0,0,0,.25);opacity:0;pointer-events:none;white-space:nowrap;',
  'font-size:11px;color:var(--dsw-alias-label-primary);transition:opacity .15s ease-out}',
  '.omamusic-meter:hover .omamusic-viz-tip{opacity:1;transition-delay:1s}',
  // Progress line along the foot, seek line over it: no thumb, the end of
  // the line is the handle.
  '.omamusic-line{position:absolute;left:0;right:0;bottom:0;height:2px;transform-origin:left;',
  'background:var(--dsw-alias-brand-primary);transition:height .15s ease-out}',
  '.omamusic:hover .omamusic-line,.omamusic:focus-within .omamusic-line{height:4px}',
  '.omamusic-seek{position:absolute;left:0;right:0;bottom:-6px;width:100%;height:14px;margin:0;',
  '-webkit-appearance:none;appearance:none;background:transparent;border:none;touch-action:none}',
  '.omamusic-seek::-webkit-slider-runnable-track{height:14px;background:transparent}',
  '.omamusic-seek::-moz-range-track{height:14px;background:transparent}',
  '.omamusic-seek::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:0;height:14px;',
  'border:none;background:transparent}',
  '.omamusic-seek::-moz-range-thumb{width:0;height:14px;border:none;background:transparent}',
  // Hover tooltip: the full title over the artist, painted with the tip
  // token so it follows the active palette (fallback: the overlay surface).
  '.omamusic-tip{position:absolute;left:0;bottom:calc(100% + 8px);display:flex;flex-direction:column;',
  'gap:2px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);',
  'background:var(--dsw-specific-tip, var(--dsw-alias-bg-overlay));',
  'box-shadow:0 4px 16px rgba(0,0,0,.25);opacity:0;pointer-events:none;white-space:nowrap;',
  'transition:opacity .15s ease-out}',
  // The tip lingers a moment before it appears — 1.5 s of hover, then the
  // same fade; leaving unpainted, it fades out at once. And it is no
  // luggage: while the card is being dragged the tip stays behind.
  '.omamusic:hover .omamusic-tip{opacity:1;transition-delay:1.5s}',
  '.omamusic[data-dragging="1"] .omamusic-tip{opacity:0;transition-delay:0s}',
  // Nor does the card tip crowd the meter's own: while the pointer is on
  // the meter, the only tip is the switch's.
  '.omamusic:has(.omamusic-meter:hover) .omamusic-tip{opacity:0;transition-delay:0s}',
  '.omamusic-tip-title{font-size:12px;font-weight:500;color:var(--dsw-alias-label-primary)}',
  '.omamusic-tip-artist{font-size:11px;color:var(--dsw-alias-label-secondary)}',
].join('\n')

/**
 * Transport glyphs borrowed from radio.omarchy.org (src/lib/icons.ts) and
 * kept as this plugin's own file at `assets/icons/transport.json`, which the
 * Host half serves inside `omamusic.meta`; the cells below are the inlined
 * copy of that file, the fallback if it is missing. Stepped pixel art on a
 * 12x10 lattice, one cell to one CSS pixel, so the steps land on the pixel
 * grid and crispEdges keeps them there. Play: the BIG triangle; Pause: two
 * 3x10 bars.
 */
var SCALE = 1
var PLAY_CELLS = [
  [1, 0, 2, 1], [1, 1, 4, 1], [1, 2, 6, 1], [1, 3, 8, 1], [1, 4, 10, 1],
  [1, 5, 10, 1], [1, 6, 8, 1], [1, 7, 6, 1], [1, 8, 4, 1], [1, 9, 2, 1],
]
var PAUSE_CELLS = [[2, 0, 3, 10], [7, 0, 3, 10]]

/** Replaced with the file's cells the moment the meta — and icons — arrive. */
var GLYPHS = { play: PLAY_CELLS, pause: PAUSE_CELLS }

function transportIcon(on) {
  var cells = on ? GLYPHS.pause : GLYPHS.play
  var rects = []
  for (var i = 0; i < cells.length; i += 1) {
    rects.push(h('rect', { key: i, x: cells[i][0], y: cells[i][1], width: cells[i][2], height: cells[i][3] }))
  }
  return h('svg', {
    viewBox: '0 0 12 10', width: 12 * SCALE, height: 10 * SCALE,
    fill: 'currentColor', 'shape-rendering': 'crispEdges', 'aria-hidden': 'true',
  }, rects)
}

function applyFeature(host) {
  // The feature attaches when its services exist: the page's plugin tree is
  // still assembling while this apply runs, so a plain `ctx.get` here would
  // read an empty tree and the section would never appear.
  host.inject(['slots'], function (ctx) {
  var slots = ctx.get('slots')
  if (slots === undefined) return

  // ---------------------------------------------------------------
  // The sound. A port of the site's src/lib/music.ts, kept to what
  // the card needs: state, silent clock, timeline bands, live meter.
  // ---------------------------------------------------------------
  var meta = null
  var frames = null
  var duration = 0
  var fps = 15
  var tlBands = 16
  var clockZero = null

  var audio = null
  var audioContext = null
  var analyser = null
  var running = false
  var objectUrl = ''
  // Set by the disposer: the 7 MB track can land long after the plugin was
  // stopped, and a late arrival must not open an audio context or start
  // playing sound nothing can reach any more.
  var disposed = false
  var freq = new Float32Array(0)
  var bins = []
  var floorArr = new Float32Array(BANDS)
  var peakArr = new Float32Array(BANDS)
  for (var p = 0; p < BANDS; p += 1) peakArr[p] = 0.3

  /** paused | loading | playing | failed. */
  var state = 'paused'
  var touched = false

  /** Whether the meter is held by hand — clicking it freezes, clicking
   *  again lets it run. Sound and progress carry on either way. */
  var vizPaused = false

  var notifier = createNotifier()
  var announce = notifier.notify
  var subscribe = notifier.subscribe

  function live() {
    return running && audio !== null && !audio.paused
  }
  function sounding() {
    return state === 'playing' || state === 'loading'
  }
  function clockPosition(now) {
    if (clockZero === null || duration <= 0) return 0
    return ((now - clockZero) / 1000) % duration
  }
  function timeNow() {
    // Once the media element exists its position is the truth — paused or
    // not, currentTime holds still where the track stopped. Before that,
    // the silent clock carries the picture.
    return audio !== null ? audio.currentTime : clockPosition(performance.now())
  }

  /** The timeline's 16 bands at a position, spread to 32 and scaled. */
  function timelineAt(position, out) {
    if (frames === null) {
      for (var z = 0; z < out.length; z += 1) out[z] = 0
      return
    }
    var n = tlBands
    var total = frames.length / n
    var f = (position / duration) * fps
    var a = Math.floor(f) % total
    var b = (a + 1) % total
    var mixRatio = f - Math.floor(f)
    for (var i = 0; i < BANDS; i += 1) {
      var at = ((i + 0.5) / BANDS) * n - 0.5
      var lo = Math.max(0, Math.min(n - 1, Math.floor(at)))
      var hi = Math.min(n - 1, lo + 1)
      var t = Math.max(0, Math.min(1, at - lo))
      var early = frames[a * n + lo] * (1 - t) + frames[a * n + hi] * t
      var late = frames[b * n + lo] * (1 - t) + frames[b * n + hi] * t
      out[i] = ((early * (1 - mixRatio) + late * mixRatio) / 255) * MUTED_GAIN
    }
  }

  function layoutBands(sampleRate) {
    var binHz = sampleRate / FFT_SIZE
    var count = FFT_SIZE / 2
    bins = []
    for (var b = 0; b < BANDS; b += 1) {
      var lo = LOW_HZ * Math.pow(HIGH_HZ / LOW_HZ, b / BANDS)
      var hi = LOW_HZ * Math.pow(HIGH_HZ / LOW_HZ, (b + 1) / BANDS)
      var from = Math.min(count - 1, Math.max(1, Math.round(lo / binHz)))
      var to = Math.min(count, Math.max(from + 1, Math.round(hi / binHz)))
      bins.push([from, to])
    }
  }

  function liveBand(b) {
    var span = bins[b]
    var power = 0
    for (var k = span[0]; k < span[1]; k += 1) {
      if (freq[k] > DB_FLOOR) power += Math.pow(10, freq[k] / 10)
    }
    var db = power > 0 ? 10 * Math.log10(power / (span[1] - span[0])) : DB_FLOOR
    var raw = Math.max(0, Math.min(1, (db - DB_FLOOR) / -DB_FLOOR))
    return { raw: raw, level: (raw - floorArr[b]) / Math.max(0.15, peakArr[b] - floorArr[b]) }
  }

  /** Four coarse levels for the meter, from whichever source is current. */
  var meterBands = new Float32Array(BANDS)
  var liveBands = new Float32Array(BANDS)
  function meter(out) {
    var per = BANDS / out.length
    var m, b, level
    if (!live() || !sounding()) {
      timelineAt(timeNow(), meterBands)
      for (m = 0; m < out.length; m += 1) {
        level = 0
        for (b = Math.floor(m * per); b < Math.floor((m + 1) * per); b += 1) {
          level = Math.max(level, meterBands[b])
        }
        out[m] = level
      }
      return
    }
    // The live reading, auto-ranged — the per-frame work the site's
    // music.sample() does and this card had never been doing: the peak
    // decays slowly and jumps to anything louder, the floor creeps up
    // towards it and drops at once. Without that the levels divide by
    // the fixed 0.3-0.15 span and clamp straight to full height, which
    // is the wall of bars the card used to freeze into.
    analyser.getFloatFrequencyData(freq)
    for (b = 0; b < BANDS; b += 1) {
      var raw = liveBand(b).raw
      peakArr[b] = Math.max(peakArr[b] * 0.9993, raw, 0.2)
      floorArr[b] = Math.min(raw, floorArr[b] + (peakArr[b] - floorArr[b]) * 0.003)
      var span = Math.max(0.15, peakArr[b] - floorArr[b])
      liveBands[b] = Math.max(0, Math.min(1, (raw - floorArr[b]) / span)) * LIVE_GAIN
    }
    for (m = 0; m < out.length; m += 1) {
      level = 0
      for (b = Math.floor(m * per); b < Math.floor((m + 1) * per); b += 1) {
        level = Math.max(level, liveBands[b])
      }
      out[m] = level
    }
  }

  /** Stitch the MP3 windows into one Blob URL. */
  function fetchTrack() {
    var parts = []
    var offset = 0
    function step() {
      if (offset >= meta.size) {
        objectUrl = URL.createObjectURL(new Blob(parts, { type: 'audio/mpeg' }))
        // The track finished arriving after the plugin was stopped: hand the
        // URL straight back rather than leaving it to nothing.
        if (disposed) {
          URL.revokeObjectURL(objectUrl)
          objectUrl = ''
        }
        return Promise.resolve()
      }
      return fetch('/api/omaseek.music.chunk?offset=' + offset + '&length=' + (1 << 20))
        .then(function (response) {
          if (!response.ok) throw new Error('omaseek: track chunk responded ' + response.status)
          return response.arrayBuffer()
        })
        .then(function (buffer) {
          var slice = new Uint8Array(buffer)
          if (slice.length === 0) throw new Error('track stream stalled at ' + offset)
          parts.push(slice)
          offset += slice.length
          return step()
        })
    }
    return step()
  }

  /** Wire the media element through the analyser, straight to the speakers. */
  function wire() {
    audio = new Audio()
    audio.loop = true
    audio.preload = 'auto'
    audio.src = objectUrl
    audio.addEventListener('playing', function () {
      running = true
      if (state === 'loading') {
        state = 'playing'
        announce()
      }
    })
    audio.addEventListener('waiting', function () {
      if (state === 'playing') {
        state = 'loading'
        announce()
      }
    })
    audio.addEventListener('pause', function () {
      running = false
    })
    audio.addEventListener('error', function () {
      state = 'failed'
      announce()
    })
    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = 0
    freq = new Float32Array(analyser.frequencyBinCount)
    layoutBands(audioContext.sampleRate)
    audioContext.createMediaElementSource(audio).connect(analyser)
    analyser.connect(audioContext.destination)
  }

  /** Start — or restart — the track for real. The first press also fetches. */
  function play() {
    touched = true
    if (state === 'playing') return
    // No meta yet, or none ever: the byte loop needs a size, and a press here
    // would throw out of the click handler and leave the card on "loading"
    // forever. Saying so is the honest answer.
    if (meta === null) {
      state = 'failed'
      announce()
      return
    }
    state = 'loading'
    announce()
    var ready = audio === null ? fetchTrack() : Promise.resolve()
    ready.then(function () {
      if (disposed) return
      if (audio === null) wire()
      if (audioContext.state !== 'running') return audioContext.resume()
    }).then(function () {
      if (disposed) return
      // A cold start picks up where the silent clock got to; a resumed
      // one simply goes on from where it was paused.
      if (audio.currentTime === 0 && duration > 0) audio.currentTime = clockPosition(performance.now())
      return audio.play()
    }).catch(function () {
      // Paused again before it started: that is not a failure.
      if (state === 'loading') {
        state = 'failed'
        announce()
      }
    })
  }

  /** Stop the sound where it is; the meter and line freeze with it. */
  function pause() {
    if (audio !== null) audio.pause()
    if (state !== 'failed') state = 'paused'
    announce()
  }

  function toggle() {
    if (state === 'playing' || state === 'loading') pause()
    else play()
  }

  function seek(seconds) {
    if (duration <= 0) return
    var at = Math.max(0, Math.min(duration - 0.5, seconds))
    // The media element when there is one — running or paused alike;
    // the silent clock in any case, so the two agree if sound returns.
    if (audio !== null) audio.currentTime = at
    clockZero = performance.now() - at * 1000
  }

  // The meta + timeline arrival boots the silent clock, exactly as the
  // site's loadMusic() does on page paint.
  ctx.effect(function () {
    var alive = true
    fetchJson('/api/omaseek.music.meta').then(function (result) {
      if (!alive) return
      var tl = result.timeline
      // A host with no track answers 200 with a null timeline rather than
      // failing the request — the card reports that instead of throwing out
      // of its own fulfillment handler, which no rejection handler can catch.
      if (tl === null || tl === undefined) {
        meta = result
        state = 'failed'
        announce()
        return
      }
      meta = result
      if (result.icons !== null && result.icons !== undefined
          && result.icons.play && result.icons.pause
          && Array.isArray(result.icons.play.cells) && Array.isArray(result.icons.pause.cells)) {
        GLYPHS = { play: result.icons.play.cells, pause: result.icons.pause.cells }
      }
      duration = tl.duration
      fps = tl.fps
      tlBands = tl.bands
      var raw = atob(tl.spectrum)
      frames = new Uint8Array(raw.length)
      for (var i = 0; i < raw.length; i += 1) frames[i] = raw.charCodeAt(i)
      if (clockZero === null) clockZero = performance.now()
      announce()
    }, function (error) {
      console.error('omamusic: ' + String((error && error.message) || error))
    })
    return function () {
      alive = false
      disposed = true
      if (audio !== null) {
        audio.pause()
        audio.src = ''
      }
      if (objectUrl !== '') URL.revokeObjectURL(objectUrl)
      if (audioContext !== null) {
        try { audioContext.close() } catch (ignored) {}
      }
    }
  }, 'omamusic: track')

  ctx.effect(function () { return insertSheet(CSS, 'omamusic:cards') }, 'omamusic: styles')

  // ---------------------------------------------------------------
  // The card. Visual port of MusicControl.tsx, plus two things the
  // site does not do: it floats in the shell overlay, and it drags.
  // ---------------------------------------------------------------

  /**
   * Keep a dragged card inside the window.
   * A card wider than the window has no valid range at all, so the near margin
   * wins — the alternative (clamping to a negative upper bound) would drag the
   * card off-screen and take its controls with it.
   */
  function clampToViewport(value, size, extent) {
    var upper = extent - size - 8
    if (upper < 8) return 8
    return Math.min(Math.max(value, 8), upper)
  }
  function Player() {
    var tick = React.useState(0)
    var bump = function () { tick[1](function (n) { return n + 1 }) }
    React.useEffect(function () { return subscribe(bump) }, [])

    var cardRef = React.useRef(null)
    var lineRef = React.useRef(null)
    var rangeRef = React.useRef(null)
    var readoutRef = React.useRef(null)
    var barsRef = React.useRef([])
    var scrubbing = React.useRef(false)
    var dragMoved = React.useRef(false)
    var endDrag = React.useRef(null)
    var home = React.useRef(null)
    // A drag that is still in flight when the card unmounts would leave its
    // window listeners holding a detached element, and a seek caught mid-drag
    // would keep the line frozen for the rest of the page's life.
    React.useEffect(function () {
      return function () {
        if (endDrag.current !== null) endDrag.current()
        scrubbing.current = false
      }
    }, [])
    if (home.current === null) {
      home.current = { left: 20, top: window.innerHeight - 66 }
    }

    // Progress line, seek value, readout and meter: driven straight from
    // the track each frame, outside React, so the card never re-renders
    // for them. While a hand is on the range, the range leads. The
    // meter's own frame work is skipped while it is held by its switch.
    React.useEffect(function () {
      var levels = new Float32Array(METER_BARS)
      var smoothed = new Float32Array(METER_BARS)
      var frame = 0
      function paint() {
        frame = requestAnimationFrame(paint)
        if (!scrubbing.current) {
          var at = duration > 0 ? timeNow() / duration : 0
          if (lineRef.current !== null) {
            lineRef.current.style.transform = 'scaleX(' + at + ')'
          }
          if (rangeRef.current !== null) rangeRef.current.value = String(Math.round(at * 1000))
          if (readoutRef.current !== null) {
            readoutRef.current.textContent = clock(timeNow()) + ' / ' + clock(duration)
          }
        }
        if (!vizPaused) {
          meter(levels)
          for (var i = 0; i < METER_BARS; i += 1) {
            var rise = levels[i] > smoothed[i]
            smoothed[i] += (levels[i] - smoothed[i]) * (rise ? 0.7 : 0.2)
            var bar = barsRef.current[i]
            if (bar) {
              bar.style.height = Math.max(1, Math.round(smoothed[i] * METER_STEPS)) * 2 + 'px'
            }
          }
        }
      }
      frame = requestAnimationFrame(paint)
      return function () { cancelAnimationFrame(frame) }
    }, [])

    /** The range moved, by hand or key: show it at once, and go there. */
    function onScrub(value) {
      var at = value / 1000
      if (lineRef.current !== null) lineRef.current.style.transform = 'scaleX(' + at + ')'
      if (readoutRef.current !== null) {
        readoutRef.current.textContent = clock(at * duration) + ' / ' + clock(duration)
      }
      seek(at * duration)
    }

    // Drag: every pointer but the seek's. Window listeners while a hand
    // is down; under 4 px of travel the press stays a click.
    function onPointerDown(event) {
      var card = cardRef.current
      if (card === null || event.target.closest('.omamusic-seek') !== null) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      var startX = event.clientX
      var startY = event.clientY
      var rect = card.getBoundingClientRect()
      var originLeft = rect.left
      var originTop = rect.top
      dragMoved.current = false
      function onMove(ev) {
        var dx = ev.clientX - startX
        var dy = ev.clientY - startY
        if (!dragMoved.current && Math.abs(dx) + Math.abs(dy) < 4) return
        dragMoved.current = true
        // The tip is not dragged along; it waits for a settled hover.
        card.setAttribute('data-dragging', '1')
        var left = clampToViewport(originLeft + dx, rect.width, window.innerWidth)
        var top = clampToViewport(originTop + dy, rect.height, window.innerHeight)
        home.current = { left: left, top: top }
        card.style.left = left + 'px'
        card.style.top = top + 'px'
      }
      function onUp() {
        card.removeAttribute('data-dragging')
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        endDrag.current = null
      }
      // The card can be wider than the window; the listeners are held so an
      // unmount mid-drag takes them back out instead of leaving them on
      // `window` holding a detached card.
      endDrag.current = onUp
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    }

    var on = sounding()
    return h('div', {
      className: 'omamusic',
      'data-on': on ? '1' : '0',
      ref: cardRef,
      onPointerDown: onPointerDown,
      style: { left: home.current.left + 'px', top: home.current.top + 'px' },
    },
      h('button', {
        className: 'omamusic-art',
        type: 'button',
        'aria-pressed': on,
        'aria-label': on ? 'Pause the track' : 'Play the track',
        title: on ? 'Pause' : 'Play',
        style: meta !== null ? { backgroundImage: 'url(' + meta.art + ')' } : null,
        onClick: function () {
          if (dragMoved.current) return
          toggle()
        },
      },
        touched ? null : h('span', { 'aria-hidden': 'true', className: 'omamusic-ring' }),
        h('span', { className: 'omamusic-veil', 'aria-hidden': 'true' }, transportIcon(on))),
      h('span', { className: 'omamusic-tip', 'aria-hidden': 'true' },
        h('span', { className: 'omamusic-tip-title' }, TRACK.title),
        h('span', { className: 'omamusic-tip-artist' }, TRACK.artist)),
      h('span', { className: 'omamusic-text' },
        h('span', { className: 'omamusic-title' },
          state === 'failed' ? 'The sound could not start' : shortTitle(TRACK.title)),
        h('span', { className: 'omamusic-byline' },
          h('span', { className: 'omamusic-artist' }, TRACK.artist),
          h('span', { 'aria-hidden': 'true', ref: readoutRef, className: 'omamusic-readout' }))),
      h('button', {
        type: 'button',
        className: 'omamusic-meter',
        'aria-pressed': vizPaused,
        'aria-label': vizPaused ? 'Resume visualization' : 'Pause visualization',
        onClick: function () {
          if (dragMoved.current) return
          vizPaused = !vizPaused
          announce()
        },
      },
        [0, 1, 2, 3].map(function (i) {
          return h('span', {
            key: i,
            ref: function (el) { barsRef.current[i] = el },
            className: 'omamusic-bar',
          })
        }),
        h('span', { className: 'omamusic-viz-tip', 'aria-hidden': 'true' },
          vizPaused ? 'Resume visualization' : 'Pause visualization')),
      h('span', {
        'aria-hidden': 'true', ref: lineRef, className: 'omamusic-line',
        style: { transform: 'scaleX(0)' },
      }),
      h('input', {
        ref: rangeRef,
        type: 'range',
        className: 'omamusic-seek',
        min: 0,
        max: 1000,
        step: 5,
        defaultValue: 0,
        'aria-label': 'Position in the track',
        onPointerDown: function () { scrubbing.current = true },
        onPointerUp: function () { scrubbing.current = false },
        onPointerCancel: function () { scrubbing.current = false },
        onLostPointerCapture: function () { scrubbing.current = false },
        onInput: function (event) { onScrub(Number(event.currentTarget.value)) },
      }))
  }

  ctx.effect(function () {
    return slots.inject('shell.overlay', function () {
      return slots.register(
        { name: 'shell.overlay', id: 'omamusic-player', label: 'Omarchy music' },
        Player,
      )
    })
  }, 'omamusic: overlay card')
  })
}

exports["applyFeature"] = applyFeature
	};
	__defs["client/color.js"] = (module, exports, __req) => {
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
 * and remounts on `theme/change`, which is how it follows an OmaSeek palette:
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
 * share — which, for the four OmaSeek phrases, is exactly "We can fix every".
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

  // In-memory and per page load: the section's two choices are switches, not
  // settings, so nothing here is written anywhere or outlives a reload. (The
  // package could persist them, but a hero field that comes back off after a
  // reload would be the surprise, not the feature.)
  var state = { field: 'interactive', typing: 'loop' }
  var notifier = createNotifier()
  var notify = notifier.notify
  var subscribe = notifier.subscribe

  // The hero field is chrome: it belongs to whatever element is currently
  // the New Session hero, not to the Settings page that switches it.
  // One field at a time, on one host.
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
    // This is the whole seam to OmaSeek — the field simply follows whatever
    // palette the page carries, and works unchanged when OmaSeek is absent.
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
      h('div', { className: 'omapixel-row' },
        h('span', { className: 'omapixel-legend' }, 'Pixel field'),
        FIELD_MODES.map(function (mode) {
          return h('button', {
            key: mode,
            className: 'omapixel-chip',
            type: 'button',
            'data-on': state.field === mode ? '1' : '0',
            onClick: function () { setFieldMode(mode) },
          }, FIELD_LABELS[mode])
        })),
      h('div', { className: 'omapixel-row' },
        h('span', { className: 'omapixel-legend' }, 'Headline'),
        TYPE_MODES.map(function (mode) {
          return h('button', {
            key: mode,
            className: 'omapixel-chip',
            type: 'button',
            'data-on': state.typing === mode ? '1' : '0',
            onClick: function () { setTypingMode(mode) },
          }, TYPE_LABELS[mode])
        })),
      h('div', { className: 'omapixel-note' },
        'Off runs nothing, Ambient is the drifting lattice alone, and Interactive adds'
        + ' the cursor glow and the press stamp. The field takes its inks from the theme'
        + ' now in force. Loop keeps the site\'s rotation — type a phrase, hold, delete'
        + ' back to "We can fix every", type on — and Once types one random phrase per'
        + ' load and stops.'))
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
	__defs["client/themes.js"] = (module, exports, __req) => {
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
 * hero phrase and its pixel field are OmaPixel's, not this Plugin's.
 *
 * The palettes themselves arrive from this package's Node half over
 * `/api/omaseek.themes`, which parses them out of the research doc; only the
 * derived tokens are computed here.
 *
 * Plain JavaScript ESM, because `build/bundle-client.mjs` rewrites it into the
 * page's closure factory: `react` comes off the module table the shell seeds,
 * and every other module is relative to this directory. No JSX.
 */

const React = __req("react")
const mix = __req("client/color.js").mix
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
  // Send and stop — the site's "Get Omarchy" button scheme: brand fill,
  // brand ink glyph, hover 14 % whiter in oklch (button.tsx default variant).
  // They share the InputBar module's single `primary` class (KFmeWW_primary);
  // the hash-qualified fragment keeps the hit exact in this build — update
  // it if a harness rebuild renames the module.
  //
  // The ink falls back to the app background, never to white: `brand-ink` is a
  // token only these themes define, and the harness's own dark palette paints
  // brand as near-white — so a white fallback would leave the primary action
  // invisible for anyone who has not picked an Omarchy palette.
  'button[class*="KFmeWW_primary"]{background:var(--dsw-alias-brand-primary);',
  'color:var(--dsw-specific-brand-ink,var(--dsw-alias-bg-base))}',
  'button[class*="KFmeWW_primary"]:hover:not(:disabled){',
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

  /** The id this scheme should be painting with, or null to leave it alone. */
  function wantedFor(scheme) {
    var chosen = choices[scheme]
    if (chosen === HARNESS) return null
    if (typeof chosen === 'string' && chosen !== '') return chosen
    return AUTOMATIC[scheme] === undefined ? null : AUTOMATIC[scheme]
  }

  /**
   * Put the scheme's palette in force. Called when the palettes arrive, when
   * the scheme flips, and never in a loop: applying what is already active is
   * the one case that returns early, and `setTheme` is what fires the change
   * this listens for.
   */
  function applyForScheme() {
    if (state.loading || state.error !== '') return
    var snapshot = theme.getTheme()
    var scheme = snapshot.active.colorScheme
    var wanted = wantedFor(scheme)
    if (wanted === null || wanted === snapshot.active.id) return
    // Only a palette this package registered: ids come from the research doc,
    // and a doc that dropped one should leave the harness palette rather than
    // throw inside a theme-change listener.
    var known = false
    for (var i = 0; i < state.entries.length; i += 1) {
      if (state.entries[i].id === wanted) known = true
    }
    if (!known) return
    try {
      theme.setTheme(wanted)
    } catch (error) {
      state.error = String((error && error.message) || error)
      notify()
    }
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
    // Light and dark each remember a palette, so the scheme decides which one
    // is in force — a click on Light is not a request to forget the dark pick.
    return ctx.on('theme/change', function () { applyForScheme() })
  }, 'omaseek: scheme palette')

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
      // Remembered against its own scheme: a light pick is not a statement
      // about what a dark UI should wear.
      choices[entry.scheme] = entry.id
      saveChoices()
      try { theme.setTheme(entry.id) } catch (error) {
        state.error = String((error && error.message) || error)
        bump()
      }
    }

    // The harness's own palettes, always available. Picking Light or Dark is
    // also the opt-out for that scheme: it stops the automatic Catppuccin from
    // painting over the choice on the next scheme change. System forgets both
    // slots, which is how a reader gets back to automatic.
    function base(id) {
      if (id === 'system') {
        delete choices.light
        delete choices.dark
      } else {
        choices[id] = HARNESS
      }
      saveChoices()
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

    children.push(h('div', { key: 'base', className: 'omaseek-row' },
      h('span', { className: 'omaseek-legend' }, 'Scheme'),
      h('button', { className: 'omaseek-chip', type: 'button', 'data-on': scheme === 'light' ? '1' : '0', onClick: function () { base('light') } }, 'Light'),
      h('button', { className: 'omaseek-chip', type: 'button', 'data-on': scheme === 'dark' ? '1' : '0', onClick: function () { base('dark') } }, 'Dark'),
      h('button', { className: 'omaseek-chip', type: 'button', 'data-on': snapshot.preference === 'system' ? '1' : '0', onClick: function () { base('system') } }, 'System')))

    children.push(h('div', { key: 'legend', className: 'omaseek-row' },
      h('span', { className: 'omaseek-legend' }, scheme === 'light' ? 'Light themes' : 'Dark themes'),
      h('span', { className: 'omaseek-count' }, state.loading
        ? 'loading palettes\u2026'
        : listed.length + ' of ' + state.entries.filter(function (entry) {
          return entry.scheme === scheme
        }).length + (choices[scheme] === undefined ? ' \u00b7 automatic' : ''))))

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
  })
}

exports["applyFeature"] = applyFeature
	};
	__defs["client.js"] = (module, exports, __req) => {
/**
 * The `omaseek` browser half — one page plugin that carries the whole family.
 *
 * The client-module system mounts a package under a single bare name, so the
 * three features arrive through one entry and one `apply`. Each stays a module
 * of its own with its own Settings section and its own fiber-owned effects, so
 * splitting them into separate packages later is a matter of moving a file and
 * adding a row, not of unpicking shared state.
 */

const applyMusic = __req("client/music.js").applyFeature
const applyPixel = __req("client/pixel.js").applyFeature
const applyThemes = __req("client/themes.js").applyFeature

function apply(ctx) {
  applyThemes(ctx)
  applyPixel(ctx)
  applyMusic(ctx)
}

exports["apply"] = apply
	};
	const __entry = __req("client.js");
	if (typeof __entry.apply !== "function") {
		throw new Error("omaseek: client entry exports no apply()");
	}
	for (const key of Object.keys(__entry)) exports[key] = __entry[key];
	return module.exports;
	},
});
