window.__ModuleLoader__.load({
	id: "omaseek-music",
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
	__defs["client/music.js"] = (module, exports, __req) => {
/**
 * OmaMusic — the station card. Client half.
 *
 * A port of the deck's own player: the same card, the same analysed bands,
 * the same silent clock that keeps the meter and the progress line moving
 * before the sound is ever asked for. What this half adds is the station
 * itself — the whole playlist, walked with prev and next — so the card is no
 * longer one song but the songs, in the order the site plays them.
 *
 * The catalogue comes from the Node half over `/api/omaseek.music.tracks`,
 * which resolves the station's playlist to one address per song. The bytes are
 * streamed from the station's own host:
 * it answers with `access-control-allow-origin: *` and `accept-ranges: bytes`,
 * which is what lets the card seek inside a song and read it through the
 * analyser without a proxy in the middle.
 *
 * Browsers will not autoplay sound without a gesture, so the card starts paused
 * and waits for a press.
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

/** Shown when nothing at all could be read, not even the bundled playlist. */
var TRACK = {
  title: 'Omarchy Radio',
  artist: 'the station',
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
  // The card is a column: the site's 46px face on top, the transport it
  // hangs beneath — the same three controls the deck puts under its own card.
  // One width, whatever is playing. The column had none, so it took the width
  // of whatever the title and artist happened to be and the card changed size
  // from song to song. The title is the only thing that gives, and it gives by
  // ellipsis.
  '.omamusic{position:fixed;z-index:2147483000;display:flex;flex-direction:column;align-items:stretch;',
  'width:292px;box-sizing:border-box;',
  'border:1px solid var(--dsw-alias-border-l1);',
  'background:color-mix(in srgb, var(--dsw-alias-bg-base) 85%, transparent);',
  'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);',
  'pointer-events:auto;touch-action:none;user-select:none;cursor:move}',
  // The 2px under the row is the clearance the progress line wants above the
  // transport's top border; the line itself sits on the row's foot.
  '.omamusic-row{display:flex;height:46px;align-items:stretch;position:relative;margin-bottom:2px}',
  '.omamusic button,.omamusic input{cursor:pointer}',
  // The artwork: the mark, and nothing drawn over it.
  '.omamusic-art{position:relative;width:40px;height:40px;flex:none;align-self:flex-start;padding:0;',
  'border:none;border-right:1px solid var(--dsw-alias-border-l1);background:#000 center/cover no-repeat}',
  // Title over artist; hovering the seek swaps the artist for the readout.
  '.omamusic-text{display:flex;flex-direction:column;justify-content:center;flex:1 1 auto;',
  'padding:4px 16px 0 12px;',
  'min-width:0;line-height:1.2}',
  '.omamusic-title{font-size:12px;font-weight:500;color:var(--dsw-alias-label-primary);',
  'white-space:nowrap;max-width:34ch;overflow:hidden;text-overflow:ellipsis}',
  '.omamusic-byline{position:relative;margin-top:2px;font-size:12px;color:var(--dsw-alias-label-secondary)}',
  '.omamusic-artist,.omamusic-readout{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}',
  '.omamusic-readout{position:absolute;inset:0;opacity:0;transition:opacity .15s ease-out}',
  '.omamusic-artist{transition:opacity .15s ease-out}',
  '.omamusic:has(.omamusic-seek:hover) .omamusic-artist,.omamusic:has(.omamusic-seek:active) .omamusic-artist,',
  '.omamusic:has(.omamusic-seek:focus-visible) .omamusic-artist,.omamusic[data-seek="1"] .omamusic-artist{opacity:0}',
  '.omamusic:has(.omamusic-seek:hover) .omamusic-readout,.omamusic:has(.omamusic-seek:active) .omamusic-readout,',
  '.omamusic:has(.omamusic-seek:focus-visible) .omamusic-readout,.omamusic[data-seek="1"] .omamusic-readout{opacity:1}',
  // The four-level meter, brand-colored, driven per frame outside React.
  '.omamusic-meter{display:flex;align-items:flex-end;gap:2px;box-sizing:content-box;',
  'width:18px;height:12px;flex:none;',
  'align-self:center;position:relative;padding:10px 12px 10px 10px;margin:-10px 0 -10px -10px;',
  'border:none;background:transparent;border-radius:4px}',
  '.omamusic-meter:hover{background:rgba(128,128,128,.12)}',
  '.omamusic-bar{display:block;width:3px;flex:none;height:2px;background:var(--dsw-alias-brand-primary)}',
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
  // Hover tooltip: the full title over the artist, painted with the tip token.
  '.omamusic-tip{position:absolute;left:0;bottom:calc(100% + 8px);display:flex;flex-direction:column;',
  'gap:2px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);',
  'background:var(--dsw-specific-tip, var(--dsw-alias-bg-overlay));',
  'box-shadow:0 4px 16px rgba(0,0,0,.25);opacity:0;pointer-events:none;white-space:nowrap;',
  'transition:opacity .15s ease-out}',
  '.omamusic:hover .omamusic-tip{opacity:1;transition-delay:1.5s}',
  '.omamusic[data-dragging="1"] .omamusic-tip{opacity:0;transition-delay:0s}',
  '.omamusic:has(.omamusic-meter:hover) .omamusic-tip{opacity:0;transition-delay:0s}',
  '.omamusic-tip-title{font-size:12px;font-weight:500;color:var(--dsw-alias-label-primary)}',
  '.omamusic-tip-artist{font-size:11px;color:var(--dsw-alias-label-secondary)}',
  // The transport: the site's own three controls, moved under the card's
  // face. prev and next are presses; only the play button is a state.
  '.omamusic-transport{display:flex;align-items:center;border-top:1px solid var(--dsw-alias-border-l1)}',
  '.omamusic-tb{display:flex;flex:1;height:26px;align-items:center;justify-content:center;',
  'padding:0;border:none;background:transparent;color:var(--dsw-alias-label-secondary)}',
  '.omamusic-tb + .omamusic-tb{border-left:1px solid var(--dsw-alias-border-l1)}',
  '.omamusic-tb:hover{background:rgba(128,128,128,.12);color:var(--dsw-alias-label-primary)}',
  '.omamusic-tb:focus-visible{outline:1px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',
  '.omamusic-tb[aria-disabled="true"]{opacity:.4}',
  '.omamusic-tb-play{color:var(--dsw-alias-label-primary)}',
  // The label the station puts on a song that swears, kept small enough to
  // sit between the byline and the meter without pushing either aside.
  '.omamusic-e{flex:none;align-self:center;padding:0 4px;border:1px solid var(--dsw-alias-border-l1);',
  'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9px;line-height:13px;',
  'color:var(--dsw-alias-label-secondary)}',
  // Where this track sits in the station, when it came from one. It is a
  // label rather than a control, so the press goes to the row underneath.
  // One box, whatever the track number. The card's own width is fixed, so a
  // counter that grows from "9/33" to "10/33" would push the meter sideways;
  // reserving the widest it ever gets keeps everything to its right still.
  '.omamusic-count{flex:none;align-self:center;box-sizing:border-box;width:44px;text-align:center;',
  'padding:0;pointer-events:none;',
  'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;',
  'color:var(--dsw-alias-label-secondary)}',
].join('\n')

/**
 * Transport glyphs borrowed from radio.omarchy.org (src/lib/icons.ts). Stepped
 * pixel art on a 12x10 lattice, one cell to one CSS pixel, so the steps land
 * on the pixel grid and crispEdges keeps them there. Play: the BIG triangle;
 * Pause: two 3x10 bars; prev and next: the site's two small triangles a side,
 * the way a tape deck marks them rather than a bar and one.
 */
var SCALE = 1
var PLAY_CELLS = [
  [1, 0, 2, 1], [1, 1, 4, 1], [1, 2, 6, 1], [1, 3, 8, 1], [1, 4, 10, 1],
  [1, 5, 10, 1], [1, 6, 8, 1], [1, 7, 6, 1], [1, 8, 4, 1], [1, 9, 2, 1],
]
var PAUSE_CELLS = [[2, 0, 3, 10], [7, 0, 3, 10]]
/** One small triangle is ten rows: 1,2,3,4,5 cells out then 5,4,3,2,1 back. */
var SMALL = [1, 2, 3, 4, 5, 5, 4, 3, 2, 1]

/** A triangle's rows as rects, growing toward `dir` from `x0` in a `span`. */
function triangleCells(rows, dir, x0, span) {
  var cells = []
  for (var y = 0; y < rows.length; y += 1) {
    var w = rows[y]
    cells.push([dir === 'right' ? x0 : x0 + (span - w), y, w, 1])
  }
  return cells
}

var PREV_CELLS = triangleCells(SMALL, 'left', 0, 5).concat(triangleCells(SMALL, 'left', 6, 5))
var NEXT_CELLS = triangleCells(SMALL, 'right', 0, 5).concat(triangleCells(SMALL, 'right', 6, 5))

var GLYPHS = { play: PLAY_CELLS, pause: PAUSE_CELLS, prev: PREV_CELLS, next: NEXT_CELLS }

function glyphIcon(name) {
  var cells = GLYPHS[name] === undefined ? PLAY_CELLS : GLYPHS[name]
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
  // read an empty tree and the card would never appear.
  host.inject(['slots'], function (ctx) {
  var slots = ctx.get('slots')
  if (slots === undefined) return

  // ---------------------------------------------------------------
  // The sound. A port of the site's src/lib/music.ts, kept to what
  // the card needs: state, silent clock, live meter.
  // ---------------------------------------------------------------
  var meta = null
  var duration = 0
  var clockZero = null

  /**
   * The station: every track the card can walk through, and which one it is
   * on. The queue is the playlist as the Node half resolved it — the
   * station's own address for each song — so next and prev are an index in
   * this list and nothing more. A card pointed at one file by hand has a
   * queue of exactly that one track.
   */
  var queue = []
  var index = 0
  /** Whether the card is meant to be making sound, across track changes. */
  var wantPlaying = false
  /** Whether a pointer is on the seek line, which swaps the byline to the
   *  clock. A card of this size has no stateful component to hold it in, and
   *  the swap is a presentation detail rather than music. */
  var atSeek = false

  var audio = null
  var audioContext = null
  var analyser = null
  var running = false
  /** What the element was last pointed at, for the CORS retry. */
  var trackSrc = ''
  /** Whether the CORS retry has already been spent on this track. */
  var loadRetried = false
  /**
   * Set when the card itself moved the track on — a song ending, or a failed
   * one it had chosen. The error path reads it to tell "the station is down,
   * walk on" from "the listener picked this song and it is not there", which
   * is not a reason to run the whole list past them.
   */
  var endedByItself = false
  // Set by the disposer: a track can land long after the plugin was stopped,
  // and a late arrival must not open an audio context or start playing sound
  // nothing can reach any more.
  var disposed = false
  var freq = new Float32Array(0)
  var bins = []
  var floorArr = new Float32Array(BANDS)
  var peakArr = new Float32Array(BANDS)
  for (var p = 0; p < BANDS; p += 1) peakArr[p] = 0.3

  /** Which start() attempt is the current one. See `start`. */
  var attempt = 0
  /** paused | loading | playing | failed. */
  var state = 'paused'
  /** Why the card is not playing, when it is not. */
  var failure = ''

  /** Whether the meter is held by hand — clicking it freezes, clicking
   *  again lets it run. Sound and progress carry on either way. */
  var vizPaused = false

  var notifier = createNotifier()
  var announce = notifier.notify
  var subscribe = notifier.subscribe

  /** The track that is playing, or the only one there is. */
  function current() {
    return queue.length === 0 ? null : queue[index]
  }
  function title() {
    var track = current()
    return track === null || track.title === '' ? TRACK.title : track.title
  }
  function artist() {
    var track = current()
    return track === null || track.artist === '' ? TRACK.artist : track.artist
  }
  /** Past the end of the station the first song comes round again, which is
   *  what the deck does with its own playlist. */
  function step(by) {
    if (queue.length === 0) return
    index = (index + by + queue.length) % queue.length
  }

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
  var liveBands = new Float32Array(BANDS)
  function meter(out) {
    var per = BANDS / out.length
    var m, b, level
    if (!live() || !sounding()) {
      // Nothing is coming out of the speakers, so the bars stand down rather
      // than draw the browser's last audio buffer for ever, which would be a
      // meter of the past.
      for (m = 0; m < out.length; m += 1) out[m] = 0
      return
    }
    // The live reading, auto-ranged: the peak decays slowly and jumps to
    // anything louder, the floor creeps up towards it and drops at once.
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

  /**
   * What the sound needs before it can start: a track, and an address to fetch
   * it from. The element does the fetching, so there is nothing else to do.
   */
  function prepare(track) {
    if (track === null) {
      if (failure === '') failure = 'No track is set'
      return Promise.reject(new Error('omaseek: no track'))
    }
    if (playable(track)) return Promise.resolve()
    failure = 'The track could not be played'
    return Promise.reject(new Error('omaseek: no track'))
  }

  /**
   * Where the sound comes from for the track that is up: the station's own
   * copy of the song. There is no other kind of track.
   */
  function source() {
    var track = current()
    return track === null || typeof track.url !== 'string' ? '' : track.url
  }

  /** Whether the track that is up has anywhere to play from at all. */
  function playable(track) {
    return track !== null && typeof track.url === 'string' && track.url !== ''
  }

  /**
   * Point the element at the track that is up, and follow it. Every song takes
   * over the same element, so the analyser wired to it keeps working and the
   * meter is never rebuilt for a new track. `crossOrigin` is set *before* the
   * source, because assigning one to an element that is already fetching
   * without CORS does not re-read it with any.
   */
  function load(track, keepEnded) {
    if (audio === null || track === null) return
    trackSrc = source()
    loadRetried = false
    if (!keepEnded) endedByItself = false
    // Reading the station's stream through the analyser needs the station to
    // allow it; the radio does. If one day it does not, the error handler
    // retries without, which keeps the sound and loses the meter.
    audio.crossOrigin = 'anonymous'
    // A station of one has nothing to walk on to, so that element loops; a
    // list of songs changes track instead.
    audio.loop = queue.length <= 1
    audio.src = trackSrc
  }

  /** Wire the media element through the analyser, straight to the speakers. */
  function wire() {
    audio = new Audio()
    audio.preload = 'auto'
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
    audio.addEventListener('ended', end)
    audio.addEventListener('error', function () {
      // A streamed track from a host that sends no CORS headers fails outright
      // while `crossOrigin` is set. Dropping it keeps the sound and loses only
      // the meter.
      if (!loadRetried) {
        loadRetried = true
        audio.crossOrigin = null
        audio.src = trackSrc
        audio.load()
        if (wantPlaying) {
          var again = audio.play()
          if (again !== undefined && again.catch !== undefined) again.catch(function () {})
        }
        return
      }
      // The station, or the file, is not there. A track that ended into this
      // one is the card's own doing, so it is the card's to walk on from —
      // once. A station that is down would otherwise run the whole list past
      // the listener one failure at a time, so the walk clears its own flag
      // and the next failure is simply the failure.
      failure = 'The track could not be reached'
      state = 'failed'
      running = false
      if (endedByItself) {
        endedByItself = false
        advance()
      } else announce()
    })
    // Whoever answers knows how long the track is, which is what the progress
    // line and the seek work from. A track that changes under us — the next
    // one — re-lengths the card here rather than at the press.
    audio.addEventListener('loadedmetadata', function () {
      if (isFinite(audio.duration) && audio.duration > 0) {
        duration = audio.duration
        clockZero = performance.now() - audio.currentTime * 1000
        announce()
      }
    })
    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = 0
    freq = new Float32Array(analyser.frequencyBinCount)
    layoutBands(audioContext.sampleRate)
    audioContext.createMediaElementSource(audio).connect(analyser)
    analyser.connect(audioContext.destination)
    load(current(), true)
  }

  /**
   * Bring the sound up on the track that is up. A track already loaded simply
   * resumes from where it was paused, picking up the silent clock if it has
   * never sounded; one that has just taken over starts from its own top.
   */
  /**
   * Bring the sound up on the track that is up: what a press on play, on next
   * or on an ended song all end in.
   *
   * Every attempt carries a number, and only the newest one may report
   * anything. Pressing play and then pause, or next twice in quick
   * succession, aborts the request the earlier press started — the browser
   * answers that with "play() request was interrupted by a call to pause()" —
   * and an abandoned attempt must not be read as a track that failed. It was:
   * the card went to failed with nothing to say, leaving a blank, silent,
   * apparently broken card with no message and no way back.
   */
  function start(keepEnded) {
    var track = current()
    attempt += 1
    var mine = attempt
    state = 'loading'
    if (failure !== 'The track could not be reached') failure = ''
    announce()
    var ready = audio === null ? prepare(track) : Promise.resolve()
    ready.then(function () {
      // A newer press owns the card now; this attempt is over, and quietly.
      if (disposed || mine !== attempt) return
      if (audio === null) wire()
      else if (trackSrc !== source()) load(track, keepEnded)
      if (audioContext.state !== 'running') return audioContext.resume()
    }).then(function () {
      if (disposed || mine !== attempt) return
      if (audio.currentTime === 0 && duration > 0) audio.currentTime = clockPosition(performance.now())
      return audio.play()
    }).catch(function (error) {
      if (disposed || mine !== attempt) return
      // An interrupted play is a play that is no longer wanted, not a failure.
      if (error !== null && error !== undefined && error.name === 'AbortError') return
      if (state === 'loading') {
        state = 'failed'
        if (failure === '') failure = 'The track could not be played'
        announce()
      }
    })
  }

  /** Start — or restart — the track for real. The first press also fetches. */
  function play() {
    wantPlaying = true
    if (state === 'playing') return
    if (current() === null) {
      // Nothing to play — but the card already knows *why* nothing is there,
      // and "no track is set" is not the answer when the station was the thing
      // that could not be read. Only a card that never got an answer says it.
      if (failure === '') failure = 'No track is set'
      state = 'failed'
      announce()
      return
    }
    start(false)
  }

  /** Stop the sound where it is; the meter and line freeze with it. */
  function pause() {
    wantPlaying = false
    if (audio !== null) audio.pause()
    if (state !== 'failed') state = 'paused'
    announce()
  }

  function toggle() {
    if (wantPlaying) pause()
    else play()
  }

  /**
   * The track is over. The station plays on into the next one if the listener
   * had it playing, and stops quietly if they had paused it — a song ending is
   * not a reason to start making noise, but it is a reason to be at the top of
   * the next one.
   */
  function end() {
    step(1)
    endedByItself = true
    duration = 0
    clockZero = performance.now()
    if (wantPlaying) start(true)
    else {
      load(current(), true)
      announce()
    }
  }

  /**
   * Next and prev. A track picked by hand has to sound: the press is a gesture
   * of its own, and walking the station silently would be a control that does
   * nothing. The element is left alone until the meta arrives — `start` loads
   * the new track itself — so the old sound is not cut before the new one is
   * ready.
   */
  function go(by) {
    if (queue.length === 0) return
    wantPlaying = true
    step(by)
    duration = 0
    clockZero = performance.now()
    announce()
    start(false)
  }

  /** Walk on from a track that failed, when the card is what chose it. */
  function advance() {
    endedByItself = true
    if (wantPlaying && queue.length > 1) {
      step(1)
      start(true)
      return
    }
    state = 'failed'
    announce()
  }

  function seek(seconds) {
    if (duration <= 0) return
    var at = Math.max(0, Math.min(duration - 0.5, seconds))
    // The media element when there is one — running or paused alike;
    // the silent clock in any case, so the two agree if sound returns.
    if (audio !== null) audio.currentTime = at
    clockZero = performance.now() - at * 1000
  }

  // The catalogue's arrival is what the card walks through: the station's own
  // playlist, in the order the site plays it.
  ctx.effect(function () {
    var alive = true

    function showStation(result) {
      var tracks = result.tracks === undefined || result.tracks === null ? [] : result.tracks
      if (tracks.length === 0) throw new Error('the station listed no tracks')
      queue = tracks
      index = 0
      meta = current()
      announce()
    }

    function showNothing(why) {
      meta = null
      state = 'failed'
      // What the half that answered actually said. A card that only says it
      // could not load leaves whoever is looking at it — and whoever wrote it —
      // with nothing to go on; the reason the fetch gave is worth more than the
      // sentence we would have written for it.
      failure = why === '' ? 'The station could not be loaded' : 'The station: ' + why
      console.error('omamusic: ' + failure)
      announce()
    }

    // The station, in one answer. A host with no catalogue route at all — an
    // older build — leaves the card with nothing to play, and that is said
    // rather than worked around.
    fetchJson('/api/omaseek.music.tracks').then(function (result) {
      if (!alive) return
      try {
        showStation(result)
      } catch (empty) {
        var said = String((empty && empty.message) || empty)
        console.error('omamusic: ' + said)
        if (!alive) return
        showNothing(said)
      }
    }).catch(function (error) {
      if (!alive) return
      var why = String((error && error.message) || error)
      console.error('omamusic: ' + why)
      showNothing(why)
    })

    return function () {
      alive = false
      disposed = true
      if (audio !== null) {
        audio.pause()
        audio.src = ''
      }
      if (audioContext !== null) {
        try { audioContext.close() } catch (ignored) {}
      }
    }
  }, 'omamusic: station')

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

    /**
     * The range moved, by hand or key: show it at once, and go there.
     *
     * The readout written here is also what the byline turns into under a
     * pointer on the seek line; see `onSeekHover` in the card, which hands the
     * line's own hover to the card so the byline can swap.
     */
    function onScrub(value) {
      var at = value / 1000
      if (lineRef.current !== null) lineRef.current.style.transform = 'scaleX(' + at + ')'
      if (readoutRef.current !== null) {
        readoutRef.current.textContent = clock(at * duration) + ' / ' + clock(duration)
      }
      seek(at * duration)
    }

    /**
     * While a pointer is on the seek line the byline shows the clock instead
     * of the artist: where the song is, and how long it is.
     *
     * The stylesheet does this same swap with `:has()`. This does it by hand
     * as well, so the swap does not depend on that selector — and so it can be
     * read off the card in a test rather than only seen on a screen.
     */
    function onSeekHover(over) {
      atSeek = over
      if (over && readoutRef.current !== null) {
        readoutRef.current.textContent = clock(timeNow()) + ' / ' + clock(duration)
      }
      announce()
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
    var playing = wantPlaying && state !== 'failed'
    var art = meta !== null && typeof meta.art === 'string' ? meta.art : ''
    var fromStation = queue.length > 1
    return h('div', {
      className: 'omamusic',
      'data-seek': atSeek ? '1' : null,
      ref: cardRef,
      onPointerDown: onPointerDown,
      style: { left: home.current.left + 'px', top: home.current.top + 'px' },
    },
      h('div', { className: 'omamusic-row' },
        // Still a button — the largest target on the card, and it plays and
        // pauses — but it draws nothing over the mark.
        h('button', {
          className: 'omamusic-art',
          type: 'button',
          'aria-pressed': on,
          'aria-label': on ? 'Pause the track' : 'Play the track',
          title: on ? 'Pause' : 'Play',
          style: art === '' ? null : { backgroundImage: 'url(' + art + ')' },
          onClick: function () {
            if (dragMoved.current) return
            toggle()
          },
        }),
        h('span', { className: 'omamusic-tip', 'aria-hidden': 'true' },
          h('span', { className: 'omamusic-tip-title' }, title()),
          h('span', { className: 'omamusic-tip-artist' }, artist())),
        h('span', { className: 'omamusic-text' },
          h('span', { className: 'omamusic-title' },
            state === 'failed' ? failure : shortTitle(title())),
          h('span', { className: 'omamusic-byline' },
            h('span', { className: 'omamusic-artist' }, artist()),
            h('span', { 'aria-hidden': 'true', ref: readoutRef, className: 'omamusic-readout' }))),
        // The station labels the songs that swear, and the label is the
        // playlist's own field — the card only has to say so.
        current() !== null && current().explicit === true
          ? h('span', { className: 'omamusic-e', title: 'Explicit' }, 'E')
          : null,
        fromStation ? h('span', { className: 'omamusic-count' }, (index + 1) + '/' + queue.length) : null,
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
          // The byline swaps to the clock while a pointer is on the line.
          onPointerEnter: function () { onSeekHover(true) },
          onPointerLeave: function () { onSeekHover(false) },
          // A range input answers a drag and the arrow keys, but a plain press
          // on the track leaves its value where it was — so the line would look
          // seekable everywhere and only work under a finger that kept moving.
          // Where the press landed is the position asked for, worked out from
          // the element's own box so a card that has been dragged still seeks
          // where it was pressed.
          onClick: function (event) {
            var range = event.currentTarget
            var box = range.getBoundingClientRect()
            if (box.width <= 0) return
            var at = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width))
            onScrub(Math.round(at * Number(range.max)))
          },
        })),
      // The deck's own transport, in the same order: back, play, forward.
      // prev and next are presses; only the middle one is a state.
      h('div', { className: 'omamusic-transport' },
        h('button', {
          type: 'button',
          className: 'omamusic-tb',
          'aria-label': 'Previous track',
          title: 'Previous track',
          'aria-disabled': fromStation ? null : 'true',
          onClick: function () {
            if (dragMoved.current) return
            go(-1)
          },
        }, glyphIcon('prev')),
        h('button', {
          type: 'button',
          className: 'omamusic-tb omamusic-tb-play',
          'aria-label': playing ? 'Pause' : 'Play',
          title: playing ? 'Pause' : 'Play',
          onClick: function () {
            if (dragMoved.current) return
            toggle()
          },
        }, glyphIcon(playing ? 'pause' : 'play')),
        h('button', {
          type: 'button',
          className: 'omamusic-tb',
          'aria-label': 'Next track',
          title: 'Next track',
          'aria-disabled': fromStation ? null : 'true',
          onClick: function () {
            if (dragMoved.current) return
            go(1)
          },
        }, glyphIcon('next'))))
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
	__defs["client.js"] = (module, exports, __req) => {
/**
 * The `omaseek-music` browser half.
 *
 * One package is one browser plugin — the client-module system mounts a browser
 * half by its package's bare name, and a row carries no more than that — so each
 * feature owns its entry, its bundle and its row on the Plugins page.
 */

const applyMusic = __req("client/music.js").applyFeature

function apply(ctx) {
  applyMusic(ctx)
}

exports["apply"] = apply
	};
	const __entry = __req("client.js");
	if (typeof __entry.apply !== "function") {
		throw new Error("omaseek-music: client entry exports no apply()");
	}
	for (const key of Object.keys(__entry)) exports[key] = __entry[key];
	return module.exports;
	},
});
