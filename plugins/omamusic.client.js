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
 * kept at `assets/icons/transport.json` and served by the Host half — play,
 * always shown when paused; pause, hidden while playing and lifted by hover
 * — and unlike the site's volume fade this card pauses the track for real.
 * The meter, too, is a switch of its own: a click holds the bars frozen,
 * sound and progress carrying on regardless.
 *
 * The bytes arrive from this Package's Host half: metadata and album art in
 * one call, the MP3 in base64 windows stitched into a Blob URL. Browsers
 * will not autoplay sound without a gesture, so the card starts paused —
 * ring pulsing, one click from the sound.
 *
 * Plain JavaScript only (no import/require/JSX/TS).
 */

/** Fallback identity; the Host serves the same strings. */
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
  // they are, a second lets them run again.
  '.omamusic-meter{display:flex;align-items:flex-end;gap:2px;width:18px;height:12px;flex:none;',
  'align-self:center;position:relative;padding:10px 12px 10px 10px;margin:-10px 2px -10px -10px;',
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
  // same fade; leaving unpainted, it fades out at once.
  '.omamusic:hover .omamusic-tip{opacity:1;transition-delay:1.5s}',
  '.omamusic-tip-title{font-size:12px;font-weight:500;color:var(--dsw-alias-label-primary)}',
  '.omamusic-tip-artist{font-size:11px;color:var(--dsw-alias-label-secondary)}',
].join('\n')

/** createElement shorthand — this Package is not compiled, so no JSX. */
function h(type, props) {
  var children = []
  for (var i = 2; i < arguments.length; i += 1) children.push(arguments[i])
  return React.createElement.apply(null, [type, props].concat(children))
}

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

return {
  apply(ctx) {
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

    var subs = []
    function announce() {
      for (var i = 0; i < subs.length; i += 1) subs[i]()
    }
    function subscribe(fn) {
      subs.push(fn)
      return function () {
        var at = subs.indexOf(fn)
        if (at >= 0) subs.splice(at, 1)
      }
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
          return Promise.resolve()
        }
        return host.call('omamusic.chunk', { offset: offset, length: 1 << 20 }).then(function (r) {
          var raw = atob(r.data)
          var slice = new Uint8Array(raw.length)
          for (var i = 0; i < raw.length; i += 1) slice[i] = raw.charCodeAt(i)
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
      state = 'loading'
      announce()
      var ready = audio === null ? fetchTrack() : Promise.resolve()
      ready.then(function () {
        if (audio === null) wire()
        if (audioContext.state !== 'running') return audioContext.resume()
      }).then(function () {
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
      host.call('omamusic.meta').then(function (result) {
        if (!alive) return
        meta = result
        if (result.icons !== null && result.icons !== undefined
            && result.icons.play && result.icons.pause) {
          GLYPHS = { play: result.icons.play.cells, pause: result.icons.pause.cells }
        }
        var tl = result.timeline
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

    ctx.effect(function () { return styles.insert(CSS) }, 'omamusic: styles')

    // ---------------------------------------------------------------
    // The card. Visual port of MusicControl.tsx, plus two things the
    // site does not do: it floats in the shell overlay, and it drags.
    // ---------------------------------------------------------------
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
      var home = React.useRef(null)
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
          var left = Math.min(Math.max(originLeft + dx, 8), window.innerWidth - rect.width - 8)
          var top = Math.min(Math.max(originTop + dy, 8), window.innerHeight - rect.height - 8)
          home.current = { left: left, top: top }
          card.style.left = left + 'px'
          card.style.top = top + 'px'
        }
        function onUp() {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
          window.removeEventListener('pointercancel', onUp)
        }
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
  },
}
