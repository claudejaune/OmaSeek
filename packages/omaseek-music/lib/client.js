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
 * The two things this package's browser half builds with: `h`, and the
 * listener list behind the card's re-renders. A bundle cannot import from a
 * sibling package, so each package that needs them carries its own copy.
 */
const React = __req("react")

/** createElement shorthand — this package is not compiled, so no JSX. */
function h(type, props) {
  var children = []
  for (var i = 2; i < arguments.length; i += 1) children.push(arguments[i])
  return React.createElement.apply(null, [type, props].concat(children))
}

/**
 * A listener list with one broadcast: the card mutates its own state and calls
 * `notify()`, and every mounted card re-renders.
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
 * The card also shuts. A rail down its right edge folds it to the width of its
 * own mark — the Omarchy picture and a play button, nothing else said — for
 * whoever would rather have the desk space back. Which way it was left is
 * remembered in the browser, because the card is a fixture over every session
 * rather than a thing to be met fresh each time.
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

/** What the hover tip calls the card before the station has named a song. */
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
var METER_BARS = 4
var METER_STEPS = 5

/**
 * The one failure the card's own code both writes and reads back: a track the
 * card chose itself could not be reached, so the card — not the listener —
 * walks on from it. One name, because a display string that decides control
 * flow is one copy-edit away from changing behaviour.
 */
var UNREACHABLE = 'The track could not be reached'

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
  // Two line colours, and one place for each. An OUTLINE is a surface's own
  // perimeter -- the card, the tooltips, the `E` badge -- and takes the
  // token the shell's own chrome draws with: the "Choose an app to open in"
  // pill up in the title bar uses `border-l4`. A DIVIDER separates two
  // regions inside one surface -- beside the mark, above the transport,
  // between its buttons, along the rail -- and stays at `border-l1`. At `l4`
  // those internal lines turned the card into a grid fighting the content it
  // holds; the outline is what should say where the card is, and the dividers
  // should only hint at how it is arranged. Nothing here is a literal
  // colour: whatever palette is in force, the card and the shell follow it.
  '--omamusic-line:var(--dsw-alias-border-l4);',
  '--omamusic-divider:var(--dsw-alias-border-l1);',
  'border:1px solid var(--omamusic-line);',
  'background:color-mix(in srgb, var(--dsw-alias-bg-base) 85%, transparent);',
  'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);',
  'transition:width .2s cubic-bezier(.4,0,.2,1);',
  'pointer-events:auto;touch-action:none;user-select:none;cursor:move}',
  // Shut, the card is the mark and the rail that opens it again: 40px of art
  // and 18px of rail, inside the two borders. The two widths are also in the
  // script, because a toggle has to keep the card on screen before the slide
  // has given it a size to measure.
  '.omamusic[data-collapsed="1"]{width:60px}',
  // The body keeps the expanded width and is clipped rather than reflowed, so
  // nothing inside moves sideways while the box slides — the collapse uncovers
  // and covers the same layout, and the byline never re-wraps mid-animation.
  '.omamusic-body{display:flex;flex-direction:column;align-items:stretch;flex:none;',
  'width:272px;overflow:hidden;',
  'transition:width .2s cubic-bezier(.4,0,.2,1)}',
  '.omamusic[data-collapsed="1"] .omamusic-body{width:40px}',
  // The byline fades instead of ending on a hard slice at the clip edge: out
  // at once on the way in, back only once the card is wide enough to hold it.
  '.omamusic-text{transition:opacity .12s ease-out .08s}',
  '.omamusic[data-collapsed="1"] .omamusic-text{opacity:0;transition-delay:0s}',
  // A shut card has nothing to seek in and nothing to read off the meter, and
  // both are live controls — hidden, not merely out of sight.
  '.omamusic[data-collapsed="1"] .omamusic-seek,',
  '.omamusic[data-collapsed="1"] .omamusic-line{display:none}',
  // The 2px under the row is the clearance the progress line wants above the
  // transport's top border; the line itself sits on the row's foot.
  '.omamusic-row{display:flex;height:46px;align-items:stretch;position:relative;margin-bottom:2px}',
  '.omamusic button,.omamusic input{cursor:pointer}',
  // The artwork: the mark, and nothing drawn over it. Bordered inside its own
  // 40px so the collapsed card, which is exactly the mark wide, does not
  // shave a pixel off the picture.
  '.omamusic-art{position:relative;box-sizing:border-box;width:40px;height:40px;flex:none;',
  'align-self:flex-start;padding:0;',
  'border:none;border-right:1px solid var(--omamusic-divider);background:#000 center/cover no-repeat}',
  // Title over artist; hovering the seek swaps the artist for the readout.
  '.omamusic-text{display:flex;flex-direction:column;justify-content:center;flex:1 1 auto;',
  'padding:4px 16px 0 12px;',
  'min-width:0;line-height:1.2}',
  '.omamusic-title{font-size:12px;font-weight:500;color:var(--dsw-alias-label-primary);',
  'white-space:nowrap;max-width:34ch;overflow:hidden;text-overflow:ellipsis}',
  // The byline is cut exactly as the title is: one line, ellipsised. It had
  // none of that, so a long artist — "Jon Håvard Gundersen" is twenty
  // characters into a hundred and thirty of room — wrapped to a second line
  // and laid it over the title inside a row that is forty-six pixels tall and
  // does not grow. The readout is absolutely positioned inside this box, so
  // the clip never touches it, and the full name is in the hover tip either way.
  '.omamusic-byline{position:relative;margin-top:2px;font-size:12px;min-width:0;',
  'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
  'color:var(--dsw-alias-label-secondary)}',
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
  'padding:6px 8px;border:1px solid var(--omamusic-line);',
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
  'gap:2px;padding:8px 10px;border:1px solid var(--omamusic-line);',
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
  '.omamusic-transport{display:flex;align-items:center;border-top:1px solid var(--omamusic-divider)}',
  '.omamusic-tb{display:flex;flex:1;height:26px;align-items:center;justify-content:center;',
  'padding:0;border:none;background:transparent;color:var(--dsw-alias-label-secondary)}',
  '.omamusic-tb + .omamusic-tb{border-left:1px solid var(--omamusic-divider)}',
  '.omamusic-tb:hover{background:rgba(128,128,128,.12);color:var(--dsw-alias-label-primary)}',
  '.omamusic-tb:focus-visible{outline:1px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',
  '.omamusic-tb[aria-disabled="true"]{opacity:.4}',
  '.omamusic-tb-play{color:var(--dsw-alias-label-primary)}',
  // prev and next leave the flow the moment a collapse starts and come back
  // only once the card is wide again. Three flex buttons squeezed into 40px
  // would show a crushed glyph for the whole slide; taken out, the play
  // button is the only one left and it is already where it wants to be — the
  // middle of three and the whole of one share a centre.
  '.omamusic-transport[data-full="0"] .omamusic-tb-prev,',
  '.omamusic-transport[data-full="0"] .omamusic-tb-next{display:none}',
  '.omamusic-transport[data-full="1"] .omamusic-tb-prev,',
  '.omamusic-transport[data-full="1"] .omamusic-tb-next{animation:omamusic-in .18s ease-out}',
  '@keyframes omamusic-in{from{opacity:0}to{opacity:1}}',
  // The label the station puts on a song that swears, kept small enough to
  // sit between the byline and the meter without pushing either aside.
  '.omamusic-e{flex:none;align-self:center;padding:0 4px;border:1px solid var(--omamusic-line);',
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
  // The collapse rail: one column the full height of the card, stuck to its
  // right edge. It is outside the clipped body rather than inside it, so it
  // stays put and stays clickable whatever width the card is sliding through.
  '.omamusic-collapse{position:absolute;right:0;top:0;bottom:0;width:18px;',
  'display:flex;align-items:center;justify-content:center;padding:0;',
  'border:none;border-left:1px solid var(--omamusic-divider);background:transparent;',
  'color:var(--dsw-alias-label-secondary)}',
  '.omamusic-collapse:hover{background:rgba(128,128,128,.12);color:var(--dsw-alias-label-primary)}',
  '.omamusic-collapse:focus-visible{outline:1px solid var(--dsw-alias-brand-primary);outline-offset:-2px}',
  '.omamusic-collapse-icon{display:block;width:14px;height:14px;flex:none}',
  // Its own tip, above the rail and right-aligned to it: a tip to the right of
  // the rail would hang off the edge of the window the card is parked against.
  '.omamusic-collapse-tip{position:absolute;right:0;bottom:calc(100% + 8px);',
  'padding:6px 8px;border:1px solid var(--omamusic-line);',
  'background:var(--dsw-specific-tip, var(--dsw-alias-bg-overlay));',
  'box-shadow:0 4px 16px rgba(0,0,0,.25);opacity:0;pointer-events:none;white-space:nowrap;',
  'font-size:11px;color:var(--dsw-alias-label-primary);transition:opacity .15s ease-out}',
  '.omamusic-collapse:hover .omamusic-collapse-tip{opacity:1;transition-delay:.4s}',
  // The rail's tip replaces the card's while the rail is hovered, the way the
  // meter's does — one tip on the card at a time.
  '.omamusic:has(.omamusic-collapse:hover) .omamusic-tip{opacity:0;transition-delay:0s}',
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

/**
 * The rail's glyph: the chevron in `art/chevron-left.svg` and
 * `art/chevron-right.svg`, inlined. Inlined rather than loaded because the
 * browser half has no asset pipeline — and because those files carry
 * `stroke="#ffffff"`, which would sit invisible on a dark theme. Painted with
 * `currentColor` instead, it follows the same token the transport buttons
 * already take, so an Omarchy palette and the harness's own dark and light
 * both colour it without this package knowing which is in force.
 *
 * The two files are the source of truth for the shape and ship with the
 * package; these strings are the copy the bundle actually draws. Change one
 * and change the other.
 */
var CHEVRON_PATH = { left: 'm15 18-6-6 6-6', right: 'm9 18 6-6-6-6' }

function chevronIcon(dir) {
  return h('svg', {
    className: 'omamusic-collapse-icon',
    viewBox: '0 0 24 24', width: 14, height: 14,
    fill: 'none', stroke: 'currentColor', 'stroke-width': 2,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
  }, h('path', { d: CHEVRON_PATH[dir] === undefined ? CHEVRON_PATH.left : CHEVRON_PATH[dir] }))
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
  /** The one mark every song on the station wears; '' when there is none. */
  var stationArt = ''
  var duration = 0
  var clockZero = null

  /**
   * The station: every track the card can walk through, and which one it is
   * on. The queue is the playlist as the Node half resolved it — the
   * station's own address for each song — so next and prev are an index in
   * this list and nothing more.
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
  /** Whether the station has been asked and has not answered yet. */
  var stationReading = false
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

  /**
   * What the browser is asked to remember, in one key: whether the card was
   * shut, and which song it was on and how far into it. The card floats over
   * every session, so both are things a reader expects to find as they left
   * them. A storage that will not answer — private mode, a denied quota — is
   * a memory for this page only, not a failure.
   *
   * One key rather than two because the two halves are written at different
   * times by different code, and a write that carried only the fold would
   * forget the song, and one that carried only the song would open the card
   * back up on the next load. Every write goes through `writeMemory`, which
   * puts down both.
   */
  var MEMORY_KEY = 'omaseek.music'
  var memory = readMemory()
  var collapsed = memory.collapsed === true
  /**
   * Whether the transport is showing all three buttons. It goes false with
   * the first frame of a collapse and true again only after the card has
   * finished widening — see the `data-full` rule.
   */
  var fullTransport = !collapsed
  /** The timer holding prev and next out until the card is wide again. */
  var widenTimer = null
  /**
   * The card's own width in each state. The stylesheet owns these; the script
   * needs them because a toggle must keep the card on screen before the slide
   * has given it a width to measure, and `getBoundingClientRect` mid-slide
   * answers with the width it is leaving.
   */
  var CARD_W = { expanded: 292, collapsed: 60 }
  /** The slide's length, matching the stylesheet's own transition. */
  var SLIDE_MS = 200
  /** How far a scrub is held back before it is written down. */
  var WRITE_DEBOUNCE = 1000
  /** How often a running card repeats where it is. See `heartbeat`. */
  var HEARTBEAT_MS = 5000

  /**
   * The remembered song, or nothing. What comes back out of storage is never
   * trusted: it is whatever a previous version wrote there, or whatever a
   * reader typed into their own console, so each field is taken on only if it
   * is the kind of thing it claims to be.
   */
  function readTrackMemory(track) {
    if (track === null || typeof track !== 'object') return null
    if (typeof track.file !== 'string' || track.file === '') return null
    var position = Number(track.position)
    var length = Number(track.duration)
    return {
      file: track.file,
      position: isFinite(position) && position > 0 ? position : 0,
      duration: isFinite(length) && length > 0 ? length : 0,
    }
  }

  /**
   * A remembered spot, or nothing. Both numbers have to be real: a spot with
   * a `NaN` in it places the card nowhere at all, and the stylesheet's own
   * anchor is a far better answer than a broken number.
   */
  function readPosition(spot) {
    if (spot === null || typeof spot !== 'object') return null
    var left = Number(spot.left)
    var top = Number(spot.top)
    if (!isFinite(left) || !isFinite(top)) return null
    return { left: left, top: top }
  }

  function readMemory() {
    var blank = { collapsed: false, track: null, position: null }
    try {
      var raw = window.localStorage.getItem(MEMORY_KEY)
      if (raw === null) return blank
      var saved = JSON.parse(raw)
      if (saved === null || typeof saved !== 'object') return blank
      return {
        collapsed: saved.collapsed === true,
        track: readTrackMemory(saved.track),
        position: readPosition(saved.position),
      }
    } catch (unavailable) {
      return blank
    }
  }

  function writeMemory() {
    try {
      window.localStorage.setItem(MEMORY_KEY, JSON.stringify({
        collapsed: collapsed,
        track: memory.track,
        position: memory.position,
        savedAt: Date.now(),
      }))
    } catch (unavailable) {
      // As above: a memory that cannot be written is not an error.
    }
  }

  /**
   * Note where the card is. The position is passed in rather than read off
   * the clock, because at the moments that call this the clock is not always
   * the truth — after a track change the element still holds the *previous*
   * song's position until the new one is loaded, and the new song starts at
   * its top, not there.
   */
  function remember(position) {
    var track = current()
    if (track === null || typeof track.file !== 'string' || track.file === '') {
      memory.track = null
      return
    }
    memory.track = {
      file: track.file,
      position: position > 0 ? position : 0,
      duration: duration,
    }
  }

  /** A write held back so a scrub does not put one down per step. */
  var writeTimer = null
  function rememberSoon(position) {
    remember(position)
    if (writeTimer !== null) return
    writeTimer = setTimeout(function () {
      writeTimer = null
      writeMemory()
    }, WRITE_DEBOUNCE)
  }

  /** Whatever was pending, written now. */
  function rememberNow(position) {
    if (writeTimer !== null) {
      clearTimeout(writeTimer)
      writeTimer = null
    }
    remember(position)
    writeMemory()
  }

  /**
   * The song and spot the last page left, carried until that track's own
   * length arrives. Carried because the silent clock answers zero while
   * `duration` is still zero, and `loadedmetadata` recomputes the clock from
   * the element's position — which on a fresh element is zero, and would
   * wipe the restored spot before it was ever drawn.
   */
  var pending = null
  /** Whether the one restore has been spent. */
  var restored = false

  /**
   * Put the card back on the song the last page was on.
   *
   * Asked once, of the first answer: a later re-fetch of the catalogue must
   * not drag the card back out from under whoever has moved it on since. A
   * song that is no longer in the station is not an error and says nothing —
   * the card is simply at the top of the list, which is where it would have
   * been anyway.
   */
  function restoreTrack() {
    if (restored) return
    restored = true
    var want = memory.track
    if (want === null) return
    for (var i = 0; i < queue.length; i += 1) {
      if (queue[i].file !== want.file) continue
      index = i
      // The remembered length stands in until the real one lands. It is what
      // lets the progress line and the readout be right on the first paint
      // rather than for a moment showing the top of a song that is not there.
      if (want.duration > 0) duration = want.duration
      var at = want.duration > 0
        ? Math.min(want.position, Math.max(0, want.duration - 0.5))
        : want.position
      if (at > 0) {
        pending = at
        clockZero = performance.now() - at * 1000
      }
      return
    }
  }

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
    return Math.max(0, Math.min(1, (db - DB_FLOOR) / -DB_FLOOR))
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
      var raw = liveBand(b)
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
      failure = UNREACHABLE
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
        var at = audio.currentTime
        // A spot carried over from the last page is spent here, and spent on
        // the track's real length rather than the remembered one. Seeking a
        // fresh element is legal because the station answers range requests;
        // without that, the spot would have to wait for the sound to start.
        if (pending !== null) {
          at = Math.max(0, Math.min(pending, duration - 0.5))
          pending = null
          if (audio.currentTime !== at) audio.currentTime = at
        }
        clockZero = performance.now() - at * 1000
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
    if (failure !== UNREACHABLE) failure = ''
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

  /**
   * Start — or restart — the track for real. A press is also what asks the
   * station again, when the card never got an answer to walk through.
   */
  function play() {
    wantPlaying = true
    if (state === 'playing') return
    if (current() === null) {
      // Nothing to play. While the station is still being read, the press is
      // the listener asking for the sound and that answer will start it. Once
      // the reading is over and nothing came back, the press asks again — which
      // is what makes a network that returns usable without reloading the page.
      if (stationReading) return
      state = 'loading'
      failure = ''
      announce()
      readStation()
      return
    }
    start(false)
  }

  /** Stop the sound where it is; the meter and line freeze with it. */
  function pause() {
    wantPlaying = false
    if (audio !== null) audio.pause()
    if (state !== 'failed') state = 'paused'
    // Where it stopped is where the next load should pick it up, so this is
    // written down rather than left to the heartbeat.
    rememberNow(timeNow())
    announce()
  }

  function toggle() {
    // A card that failed is not a card that is playing, so a press on it is the
    // listener asking for another go rather than a pause.
    if (wantPlaying && state !== 'failed') pause()
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
    // A carried-over spot belongs to the song it was carried for, not to the
    // one that just came round.
    pending = null
    rememberNow(0)
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
    pending = null
    // The press is the reader moving the card, so the memory follows it at
    // once: a refresh a second later should not put them back on the song
    // they just left.
    rememberNow(0)
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
    // Debounced: a drag down the line is a hundred positions a second, and
    // only the last of them is the one that was asked for.
    pending = null
    rememberSoon(at)
  }

  // The catalogue's arrival is what the card walks through: the station's own
  // playlist, in the order the site plays it.
  function showStation(result) {
    var tracks = result.tracks === undefined || result.tracks === null ? [] : result.tracks
    if (tracks.length === 0) throw new Error('the station listed no tracks')
    queue = tracks
    index = 0
    // The whole station wears one mark, so it arrives once with the playlist
    // rather than on each of its songs.
    stationArt = typeof result.art === 'string' ? result.art : ''
    // The card goes back to the song the last page was on, if it still has
    // it. Before the sound is considered, so a card that was left playing
    // still comes back paused and in place rather than starting from zero.
    restoreTrack()
    // A press that was waiting on this answer is what asked for it, so the
    // sound it wanted starts now that there is something to start.
    if (wantPlaying) start(false)
    else announce()
  }

  function showNothing(why) {
    stationArt = ''
    state = 'failed'
    // What the half that answered actually said. A card that only says it
    // could not load leaves whoever is looking at it — and whoever wrote it —
    // with nothing to go on; the reason the fetch gave is worth more than the
    // sentence we would have written for it.
    failure = why === '' ? 'The station could not be loaded' : 'The station: ' + why
    console.error('omamusic: ' + failure)
    announce()
  }

  /**
   * The station, in one answer. A host with no catalogue route at all — an
   * older build — leaves the card with nothing to play, and that is said
   * rather than worked around.
   *
   * The card asks once when it mounts, and a press asks again when the first
   * answer never came. A station that was down is not a card that is stuck
   * until the page is reloaded.
   */
  function readStation() {
    if (stationReading || disposed) return
    stationReading = true
    fetchJson('/api/omaseek.music.tracks').then(function (result) {
      stationReading = false
      if (disposed) return
      try {
        showStation(result)
      } catch (empty) {
        var said = String((empty && empty.message) || empty)
        console.error('omamusic: ' + said)
        if (!disposed) showNothing(said)
      }
    }).catch(function (error) {
      stationReading = false
      if (disposed) return
      var why = String((error && error.message) || error)
      console.error('omamusic: ' + why)
      showNothing(why)
    })
  }

  ctx.effect(function () {
    readStation()
    return function () {
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

  // Where the card is gets written down on the way out. `pagehide` rather than
  // `beforeunload`: it is the one that still fires when the browser puts the
  // page in the back-forward cache, and it is the last word the page gets.
  ctx.effect(function () {
    function onHide() { rememberNow(timeNow()) }
    window.addEventListener('pagehide', onHide)
    return function () { window.removeEventListener('pagehide', onHide) }
  }, 'omamusic: remembered on pagehide')

  /**
   * A heartbeat while the sound is running, so a tab that is killed outright
   * — no `pagehide`, no goodbye, no chance to say where it got to — still
   * comes back within five seconds of the mark rather than at the last place
   * anything was deliberately written. Only a running card beats; a paused
   * one has nothing to lose.
   */
  ctx.effect(function () {
    var beat = setInterval(function () {
      if (wantPlaying) rememberNow(timeNow())
    }, HEARTBEAT_MS)
    return function () { clearInterval(beat) }
  }, 'omamusic: playback heartbeat')

  // ---------------------------------------------------------------
  // The card. Visual port of MusicControl.tsx, plus two things the
  // site does not do: it floats in the shell overlay, and it drags.
  // ---------------------------------------------------------------

  /**
   * Keep a moved card inside the window.
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
    /**
     * Where a card that has been moved sits, in viewport pixels. It stays null
     * while the card has never been dragged, and the stylesheet's own bottom
     * anchor holds it 8px off the edge at whatever height it renders. A stored
     * offset is exactly what put the transport off-screen once the card grew
     * a transport row, so the resting card keeps no number at all.
     *
     * It starts from wherever the last page left it, which is a number — so a
     * card that was ever dragged comes back placed rather than resting, and
     * only one that has never been touched gets the anchor.
     */
    var home = React.useRef(memory.position === null
      ? null
      : { left: memory.position.left, top: memory.position.top })

    /**
     * Write down where the card sits. Called when the hand comes off a drag and
     * when a toggle takes the card in hand — not on every step of a drag, which
     * would be a write per pixel of travel.
     */
    function savePosition() {
      memory.position = home.current === null
        ? null
        : { left: home.current.left, top: home.current.top }
      writeMemory()
    }

    /**
     * Pull a card that is placed by number back inside the window, against the
     * box it actually has rather than a size guessed at from the stylesheet:
     * the card's height has changed once already, and the number written to
     * follow it did not.
     */
    function clampIntoWindow() {
      var card = cardRef.current
      if (card === null || home.current === null) return
      var box = card.getBoundingClientRect()
      var left = clampToViewport(home.current.left, box.width, window.innerWidth)
      var top = clampToViewport(home.current.top, box.height, window.innerHeight)
      if (left === home.current.left && top === home.current.top) return
      home.current = { left: left, top: top }
      card.style.left = left + 'px'
      card.style.top = top + 'px'
    }

    /**
     * A remembered spot was written against a window that may since have
     * changed — a smaller monitor, a shallower browser, a card left open at
     * the far right and a screen that is now narrower. Clamped before the
     * first paint, so the card is never drawn somewhere it cannot be reached.
     *
     * Not written back down. A window that shrinks for a moment should not
     * spend the spot the reader actually chose; the original stays remembered
     * and gets clamped again, as many times as the window sees fit.
     */
    React.useLayoutEffect(clampIntoWindow, [])

    /**
     * Hold the card inside the window at a width it has not reached yet.
     *
     * A card that has never been moved rests on the stylesheet's own anchor
     * 20px from the left, which cannot overflow unless the window is nearly as
     * narrow as the card — and only a widening gets near that. So the resting
     * card is only taken in hand when the clamp actually bites.
     */
    function keepOnScreen(width) {
      var card = cardRef.current
      if (card === null) return
      var box = card.getBoundingClientRect()
      var left = clampToViewport(box.left, width, window.innerWidth)
      if (home.current === null && left === box.left) return
      home.current = { left: left, top: box.top }
      card.style.left = left + 'px'
      card.style.top = box.top + 'px'
      // The card rested on the stylesheet's bottom anchor; it is placed by
      // number from here. Leaving both set would stretch it to the gap.
      card.style.bottom = ''
      savePosition()
    }

    /**
     * Open or shut the card.
     *
     * The width transition is what the eye follows. The transport's two outer
     * buttons are the one thing that cannot ride along — three flex buttons in
     * a 40px box is a crushed glyph for the whole slide — so they go with the
     * collapse and come back only once the card has widened. Taking them out
     * costs the play button nothing: the middle of three and the whole of one
     * share a centre, so it slides rather than jumps.
     *
     * Widening is also the one moment the card can push itself off the right of
     * the window, so it is clamped here against the width it is about to have,
     * not the one it still has.
     */
    function setCollapsed(next) {
      if (collapsed === next) return
      collapsed = next
      writeMemory()
      if (widenTimer !== null) {
        clearTimeout(widenTimer)
        widenTimer = null
      }
      fullTransport = false
      if (!next) {
        widenTimer = setTimeout(function () {
          widenTimer = null
          fullTransport = true
          announce()
        }, SLIDE_MS)
      }
      keepOnScreen(next ? CARD_W.collapsed : CARD_W.expanded)
      announce()
    }

    // A drag that is still in flight when the card unmounts would leave its
    // window listeners holding a detached element, and a seek caught mid-drag
    // would keep the line frozen for the rest of the page's life.
    React.useEffect(function () {
      // A moved card is placed by number, so a window that shrinks under it
      // could leave it off-screen with no way back to it. A card that has
      // never been moved is held by the stylesheet and needs nothing.
      window.addEventListener('resize', clampIntoWindow)
      return function () {
        window.removeEventListener('resize', clampIntoWindow)
        if (endDrag.current !== null) endDrag.current()
        if (widenTimer !== null) {
          clearTimeout(widenTimer)
          widenTimer = null
        }
        // A write still held back by the scrub debounce would outlive the card
        // and put down a position nothing is driving any more.
        if (writeTimer !== null) {
          clearTimeout(writeTimer)
          writeTimer = null
        }
        scrubbing.current = false
      }
    }, [])

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
        // The card rested on the stylesheet's own bottom anchor; it is placed
        // by number from here. Leaving `top` and `bottom` set together would
        // stretch it to the gap between them.
        card.style.bottom = ''
      }
      function onUp() {
        card.removeAttribute('data-dragging')
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        endDrag.current = null
        // The hand has come off and the card is where the reader wants it.
        // Only a drag that actually travelled is written: a press that never
        // moved should not spend a spot nobody chose.
        if (dragMoved.current) savePosition()
      }
      // The card can be wider than the window; the listeners are held so an
      // unmount mid-drag takes them back out instead of leaving them on
      // `window` holding a detached card.
      endDrag.current = onUp
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    }

    var playing = wantPlaying && state !== 'failed'
    var art = stationArt
    var fromStation = queue.length > 1
    return h('div', {
      className: 'omamusic',
      'data-collapsed': collapsed ? '1' : '0',
      'data-seek': atSeek ? '1' : null,
      ref: cardRef,
      onPointerDown: onPointerDown,
      // A card that has never been moved is held by the stylesheet's bottom
      // anchor, so it sits 8px off the edge at whatever height it renders —
      // its own or the window's. Once moved it is placed by number.
      style: home.current === null
        ? { left: '20px', bottom: '8px' }
        : { left: home.current.left + 'px', top: home.current.top + 'px' },
    },
      // The body is what gets shut: everything the card has to say, in a
      // column the clip can close over. The tip and the rail sit outside it —
      // the tip because it is painted above the card and the clip would take
      // it away with the rest, the rail because it has to hold its ground on
      // the right edge while the body slides under it.
      h('div', { className: 'omamusic-body' },
        h('div', { className: 'omamusic-row' },
          // The mark, and nothing else. It used to be a button that played and
          // paused — which the transport right below it also does — so it is a
          // plain plate now: it drags the card like any other part of it, and
          // the card's own hover tip is already what it shows.
          h('div', {
            className: 'omamusic-art',
            'aria-hidden': 'true',
            style: art === '' ? null : { backgroundImage: 'url(' + art + ')' },
          }),
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
        // prev and next are presses; only the middle one is a state. Shut, it
        // is the middle one alone, and `data-full` is what takes the other two
        // out of the flow — see the rule and the reason on it.
        h('div', {
          className: 'omamusic-transport',
          'data-full': fullTransport ? '1' : '0',
        },
          h('button', {
            type: 'button',
            className: 'omamusic-tb omamusic-tb-prev',
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
            className: 'omamusic-tb omamusic-tb-next',
            'aria-label': 'Next track',
            title: 'Next track',
            'aria-disabled': fromStation ? null : 'true',
            onClick: function () {
              if (dragMoved.current) return
              go(1)
            },
          }, glyphIcon('next')))),
      h('span', { className: 'omamusic-tip', 'aria-hidden': 'true' },
        h('span', { className: 'omamusic-tip-title' }, title()),
        h('span', { className: 'omamusic-tip-artist' }, artist())),
      // The rail: a button the whole height of the card, so the press is easy
      // to hit from either end. It drags the card like any other part of it,
      // and the toggle fires only if the hand did not travel.
      h('button', {
        type: 'button',
        className: 'omamusic-collapse',
        'aria-expanded': collapsed ? 'false' : 'true',
        'aria-label': collapsed ? 'Expand the player' : 'Collapse the player',
        onClick: function () {
          if (dragMoved.current) return
          setCollapsed(!collapsed)
        },
      },
        chevronIcon(collapsed ? 'right' : 'left'),
        h('span', { className: 'omamusic-collapse-tip', 'aria-hidden': 'true' },
          collapsed ? 'Expand' : 'Collapse')))
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
