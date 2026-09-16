#!/usr/bin/env node
/**
 * Execute each built browser half the way the page will, under stubs.
 *
 * `node --check` only proves a bundle parses, and a server-side check only
 * proves it is *served*. Neither runs a module body, so neither can see a name
 * that was never bound — an import rewritten into a nested block, say. For each
 * package this evaluates the bundle, hands `apply` a fake Cordis context whose
 * services and slots answer, renders every component the feature registered,
 * and then runs every disposer it returned. It runs on every `pnpm check`.
 *
 * Every package is checked on its own, the way one of them is installed: no
 * case here mounts two of them together.
 *
 * It is not a browser, and the stub React is not React: hooks have no order, no
 * re-render and no dependency comparison, so a hook-rule violation or an
 * update-path bug passes here. What it does cover is module-graph binding, apply
 * surviving the services it asks for, first-render crashes on every payload
 * shape, and teardown that throws.
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)))

// A throw inside a promise's fulfillment handler never reaches the caller and
// never appears in a `problems` list — the missing-track bug was exactly that
// shape — so an unhandled rejection is a failure of this test too.
process.on('unhandledRejection', (error) => {
  console.error('omaseek: browser half smoke test failed')
  console.error(`  - unhandled rejection: ${(error && error.message) || error}`)
  process.exit(1)
})

/* ── the page ──────────────────────────────────────────────────────────── */

function fakeElement() {
  const element = {
    dataset: {},
    style: { cssText: '', color: '' },
    className: '',
    textContent: '',
    children: [],
    classList: { add() {}, remove() {} },
    setAttribute() {},
    removeAttribute() {},
    remove() {},
    appendChild(child) { element.children.push(child); return child },
    insertBefore(child) { element.children.push(child); return child },
    querySelector() { return null },
    querySelectorAll() { return [] },
    closest() { return null },
    addEventListener() {},
    removeEventListener() {},
    // A box with a width, because the card seeks by working the position out
    // of the element it was pressed on. An empty box would be no press at all.
    getBoundingClientRect() { return { width: 200, height: 14, left: 0, top: 0, right: 200, bottom: 14 } },
  }
  return element
}

const head = fakeElement()
const body = fakeElement()
const documentStub = {
  head,
  body,
  documentElement: fakeElement(),
  createElement: fakeElement,
  querySelector() { return null },
  querySelectorAll() { return [] },
  addEventListener() {},
  removeEventListener() {},
  fonts: undefined,
}

/** Enough React for module init and one render pass; no reconciler, no hooks. */
const React = {
  createElement(type, props, ...children) {
    const given = props === null || props === undefined ? {} : props
    const all = children.length > 0 ? children : (given.children === undefined ? [] : [given.children])
    return { type, props: given, children: all }
  },
  useState(initial) {
    let value = typeof initial === 'function' ? initial() : initial
    return [value, (next) => { value = typeof next === 'function' ? next(value) : next }]
  },
  useEffect(callback) { return callback() },
  useRef(initial) { return { current: initial === undefined ? null : initial } },
  useMemo(factory) { return factory() },
  useCallback(fn) { return fn },
  useLayoutEffect(callback) { return callback() },
  createContext(value) { return { Provider: null, Consumer: null, _value: value } },
  Fragment: Symbol('Fragment'),
}

/** Backing store for the localStorage stub; reset per case. */
const store = new Map()

// The loader facade lives on `window`, and module bodies reach the rest of the
// page through that same object — so the stubs and the facade are one value,
// and `window` inside the bundle is that value rather than a bare object.
let loaded = null
const windowStub = {
  __ModuleLoader__: { load(definition) { loaded = definition } },
  document: documentStub,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  devicePixelRatio: 1,
  innerWidth: 1440,
  innerHeight: 900,
  performance,
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  getComputedStyle: () => ({ getPropertyValue: () => '', color: 'rgb(0, 0, 0)' }),
  location: { href: 'http://127.0.0.1:3113/', search: '' },
  navigator: { userAgent: 'smoke' },
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)) },
    removeItem: (key) => { store.delete(key) },
  },
}

/** What the stubbed media element does when asked to play. */
let audioMode = 'ok'
/** The element the card is driving, so a case can end a song on it. */
let lastAudio = null

/**
 * A media element that reports back the way a real one does: metadata, then
 * either `playing` or — for a host that cannot be reached — `error`.
 */
class FakeAudio {
  constructor() {
    this.listeners = {}
    this.src = ''
    this.crossOrigin = null
    this.currentTime = 0
    this.duration = 0
    this.paused = true
    lastAudio = this
  }
  addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn) }
  removeEventListener() {}
  emit(type) { for (const fn of this.listeners[type] || []) fn({ type }) }
  load() {}
  pause() { this.paused = true; this.emit('pause') }
  play() {
    setTimeout(() => {
      if (audioMode === 'error') { this.emit('error'); return }
      this.duration = 210
      this.paused = false
      this.emit('loadedmetadata')
      this.emit('playing')
    }, 0)
    // A play that a pause overtakes answers this way, and it is not a failure:
    // the browser is saying the request is no longer wanted.
    if (audioMode === 'interrupted') {
      const abort = new Error('play() request was interrupted by a call to pause()')
      abort.name = 'AbortError'
      return Promise.reject(abort)
    }
    return Promise.resolve()
  }
}

class FakeAudioContext {
  constructor() {
    this.state = 'running'
    this.sampleRate = 48000
    this.destination = {}
  }
  createAnalyser() {
    return {
      fftSize: 0, smoothingTimeConstant: 0, frequencyBinCount: 1024,
      connect() {}, getFloatFrequencyData() {},
    }
  }
  createMediaElementSource() { return { connect() {} } }
  resume() { return Promise.resolve() }
  close() {}
}

globalThis.Audio = FakeAudio
globalThis.AudioContext = FakeAudioContext
// The local-file path stitches its windows into a blob URL.
URL.createObjectURL = () => 'blob:smoke'
URL.revokeObjectURL = () => {}
globalThis.window = windowStub
globalThis.document = documentStub
globalThis.getComputedStyle = windowStub.getComputedStyle
globalThis.matchMedia = windowStub.matchMedia
globalThis.requestAnimationFrame = windowStub.requestAnimationFrame
globalThis.cancelAnimationFrame = windowStub.cancelAnimationFrame
globalThis.addEventListener = windowStub.addEventListener
globalThis.removeEventListener = windowStub.removeEventListener

/* ── the fixtures ──────────────────────────────────────────────────────── */

const PALETTE_KEYS = ['bg', 'bgDeep', 'surface', 'surface2', 'borderSubtle', 'borderStrong',
  'brand', 'text', 'textSecondary', 'textMuted', 'brandInk', 'fieldBg', 'error', 'success', 'warn']

function palette() {
  const out = {}
  for (const key of PALETTE_KEYS) out[key] = '#123456'
  return out
}

const THEMES = {
  themes: [
    { id: 'catppuccin', name: 'Catppuccin', scheme: 'dark', palette: palette() },
    { id: 'catppuccin-latte', name: 'Catppuccin Latte', scheme: 'light', palette: palette() },
    { id: 'tokyo-night', name: 'Tokyo Night', scheme: 'dark', palette: palette() },
    { id: 'white', name: 'White', scheme: 'light', palette: palette() },
  ],
}

const TIMELINE = { duration: 210, fps: 30, bands: 48, spectrum: Buffer.from([1, 2, 3]).toString('base64') }


/**
 * The station, as the Node half resolves it: every track with the address its
 * bytes are at and the art this package holds for it. Two songs is the
 * smallest list that can be walked, which is what next and prev are read
 * against — one track has nothing to be next to.
 */
const STATION = {
  station: 'omarchy',
  name: 'Omarchy',
  tracks: [
    {
      title: 'First Song', artist: 'Someone', file: 'first-song.mp3',
      url: 'https://radio.example/tracks/first-song.mp3', art: 'data:image/png;base64,AA==',
      explicit: false, size: 0, timeline: null,
    },
    {
      title: 'Second Song', artist: 'Someone Else', file: 'second-song.mp3',
      url: 'https://radio.example/tracks/second-song.mp3', art: 'data:image/png;base64,AA==',
      explicit: true, size: 0, timeline: null,
    },
  ],
}

/** A lone song streamed from somewhere: a card pointed at one URL by hand. */
const LONE = {
  station: 'omarchy', name: 'Omarchy',
  tracks: [{
    title: 'Only Song', artist: 'Someone', file: 'only.mp3',
    url: 'https://radio.example/tracks/only.mp3', art: '', explicit: false,
    size: 0, timeline: null,
  }],
}

/** A station whose one title is longer than the card can show in full. */
const LONG_TITLES = {
  station: 'omarchy',
  name: 'Omarchy',
  tracks: [{
    title: 'The Card Has To Shorten This Because It Is Long',
    artist: 'An Artist With A Long Name',
    file: 'long.mp3',
    url: 'https://radio.example/tracks/long.mp3',
    art: '', explicit: false, size: 0, timeline: null,
  }],
}

/** A station that answered and had nothing to play. */
const EMPTY = { station: 'omarchy', name: 'Omarchy', tracks: [] }

/* ── the three packages, and what each must do alone ───────────────────── */

const PACKAGES = [
  {
    dir: 'packages/omaseek-themes',
    id: 'omaseek-themes',
    label: 'OmaThemes (themes)',
    expect: { sections: ['settings.section'], overlays: 0, sectionLabel: 'OmaThemes' },
    cases: [
      { label: 'dark scheme, nothing chosen', scheme: 'dark', applied: 'omarchy-catppuccin', themes: 4 },
      { label: 'light scheme, nothing chosen', scheme: 'light', applied: 'omarchy-catppuccin-latte', themes: 4 },
      { label: 'a remembered choice', scheme: 'dark', stored: { dark: 'omarchy-tokyo-night' }, applied: 'omarchy-tokyo-night', themes: 4 },
      { label: 'a remembered opt-out', scheme: 'dark', stored: { dark: 'base' }, applied: null, themes: 4 },
      // A settings write anywhere in the harness — picking a model writes the
      // default-model section — re-publishes the settings mirror, and ui-theme
      // adopts its durable preference over the picked palette. The palette has
      // to come back, and it has to come back LAST: the presenter is handed
      // snapshots in registration order, so the final one is what `body` shows.
      {
        label: 'a settings write resets the scheme, and the palette comes back',
        scheme: 'dark', stored: { dark: 'omarchy-tokyo-night' }, applied: 'omarchy-tokyo-night',
        settingsWrite: true, themes: 4,
      },
    ],
  },
  {
    dir: 'packages/omaseek-pixel',
    id: 'omaseek-pixel',
    label: 'OmaPixel (hero)',
    expect: { sections: ['settings.section'], overlays: 0, themes: 0 },
    cases: [{ label: 'the hero section', scheme: 'dark' }],
  },
  {
    dir: 'packages/omaseek-music',
    id: 'omaseek-music',
    label: 'OmaMusic (card)',
    expect: { sections: [], overlays: 1, themes: 0 },
    cases: [
      { label: 'the station, 2 songs listed', tracks: STATION, expectFailure: null, expectTrack: 'First Song' },
      {
        // A card that has never been moved is anchored to the bottom edge by
        // the stylesheet, at whatever height it renders, instead of by a
        // number that has to be kept in step with the card's own layout.
        label: 'the resting card is anchored to the bottom edge',
        tracks: STATION, expectResting: '8px',
      },
      { label: 'the station, and it plays', tracks: STATION, play: true, audio: 'ok', expectFailure: null, expectTrack: 'First Song' },
      {
        label: 'next walks the station', tracks: STATION, play: true, audio: 'ok',
        expectFailure: null, click: 'Next track', expectTrack: 'Second Song',
      },
      {
        // The station labels the songs that swear and the card has to say so.
        // The second song in the fixture is the labelled one.
        label: 'the labelled song wears its badge', tracks: STATION,
        click: 'Next track', expectTrack: 'Second Song', expectText: 'E',
      },
      {
        // Press back from the top of the list: the station wraps to its last
        // song, the way the deck's own playlist does. Nothing is pressed to
        // play here, so what is on the card is the track, with no failure over
        // it. (A second press would land back on the first, which is the same
        // wrap read from the other side — one press is the interesting half.)
        label: 'prev walks back past the top and wraps', tracks: STATION,
        expectFailure: null, click: 'Previous track', clicks: 1, expectTrack: 'Second Song',
      },
      {
        label: 'a song ending plays the next one', tracks: STATION, play: true, audio: 'ok',
        expectFailure: null, end: true, expectTrack: 'Second Song',
      },
      {
        // The progress line is seekable by pressing it, not only by dragging.
        // Halfway along a three-and-a-half minute song is 1:45, and what says
        // so is where the media element was sent.
        label: 'the progress line seeks where it is pressed', tracks: STATION,
        play: true, audio: 'ok', seekAt: 100, expectSeek: 105,
      },
      {
        // The full names live in the hover tooltip, which is the only place a
        // title the card has to shorten is written out in full.
        label: 'the tooltip carries the whole title', tracks: LONG_TITLES,
        expectTrack: 'The Card Has To Shorten This Because It Is Long',
        expectText: 'The Card Has To Shorten…',
      },
      {
        // A pointer on the seek line swaps the byline from the artist to the
        // clock. The readout itself is painted by the card's frame loop rather
        // than rendered by React, so the proof is the card's own flag — the
        // thing the stylesheet hangs the swap on.
        label: 'the byline swaps to the clock on the seek line', tracks: STATION,
        play: true, audio: 'ok', seekHover: true, expectSeekFlag: '1',
      },
      {
        // A play the browser abandons because something newer took over. The
        // card must not read that as a track that failed: it used to, and the
        // card was left blank and silent with nothing to say.
        label: 'an interrupted play is not a failure', tracks: STATION,
        play: true, audio: 'interrupted', expectFailure: null,
        expectText: 'First Song',
      },
      {
        label: 'the station is not there', tracks: null, play: true,
        expectFailure: 'The station: omaseek: /api/omaseek.music.tracks responded 500',
      },
      {
        // The station was not there when the card loaded. A press is the
        // listener asking again, and the answer that comes back plays: the card
        // is not stuck until the page is reloaded.
        label: 'a press asks the station again after it was not there',
        tracks: STATION, stationRecovers: true, play: true, audio: 'ok',
        expectFailure: null, expectTrack: 'First Song',
      },
      {
        label: 'the station is there and the song is not', tracks: STATION, play: true, audio: 'error',
        expectFailure: 'The track could not be reached', expectTrack: 'First Song',
      },
      {
        // A station of one: nothing to walk on to, and the card knows it.
        label: 'a station with a single song', tracks: LONE, play: true, audio: 'ok',
        expectFailure: null, expectTrack: 'Only Song',
      },
      {
        // The station answered and had nothing in it.
        label: 'nothing to play', tracks: EMPTY, play: true,
        expectFailure: 'The station: the station listed no tracks',
      },
      {
        // A host with no catalogue route at all — an older build — leaves the
        // card with nothing to play, and it says so rather than failing oddly.
        label: 'a host with no catalogue route', tracks: 404, play: true,
        expectFailure: 'The station: omaseek: /api/omaseek.music.tracks responded 404',
      },
    ],
  },
]

/* ── one page load ─────────────────────────────────────────────────────── */

/** Every service a feature reads, plus a log of what it did with them. */
function makeServices() {
  const calls = { registered: [], sections: [], overlays: [], themeRegistrations: [], disposers: [], themeSet: [] }

  // The theme Service publishes the way the real one does: `setTheme()` settles
  // the active theme and synchronously hands the new snapshot to every listener
  // in registration order. That order is where the reset bug lives — a listener
  // registered after the feature's is handed the stale outer snapshot last, and
  // that is the one that gets painted — so a stub that only recorded the id
  // could never see it.
  const listeners = []
  const schemeOf = new Map()
  let preference = 'system'
  let activeId = 'dark'
  const snapshot = () => ({
    preference,
    active: { id: activeId, colorScheme: schemeOf.get(activeId) || calls.scheme },
    themes: [],
  })
  // One snapshot object per publication, handed to every listener in turn — the
  // real Service builds it once, so a listener that changes the active theme
  // mid-dispatch does not rewrite what the listeners after it receive.
  const publish = () => {
    const next = snapshot()
    for (const listener of [...listeners]) listener(next)
  }

  const themeService = {
    register(definition) {
      calls.themeRegistrations.push(definition)
      schemeOf.set(definition.id, definition.colorScheme)
      return () => { schemeOf.delete(definition.id) }
    },
    getTheme() { return snapshot() },
    setTheme(id) {
      calls.themeSet.push(id)
      preference = id
      activeId = id
      publish()
    },
  }

  /** What ui-theme's `adopt()` does when any settings write re-publishes the scope. */
  const adoptDurable = () => {
    preference = calls.scheme
    activeId = calls.scheme
    publish()
  }

  /** Take a listener last, the way ui-layout's token presenter does. */
  const observeLast = (fn) => { listeners.push(fn) }

  // The real registry runs a contribution's callback only once its slot is
  // declared, and throws when `register` is called outside that callback. The
  // stub keeps that contract, so an undeclared-slot registration fails here
  // rather than becoming a silent no-op in the page.
  let injecting = null
  const slotsService = {
    inject(name, callback) {
      calls.sections.push(name)
      const previous = injecting
      injecting = name
      const off = callback()
      injecting = previous
      return typeof off === 'function' ? off : () => {}
    },
    register(options, component) {
      if (options === undefined || options.name === undefined) throw new Error('slots.register without a slot name')
      if (injecting !== options.name) {
        throw new Error(`slots.register for "${options.name}" outside slots.inject for that slot`)
      }
      calls.registered.push({ options, component })
      if (options.name === 'shell.overlay') calls.overlays.push(options)
      return () => {}
    },
  }

  const services = { theme: themeService, slots: slotsService }
  const ctx = {
    get(name) { return services[name] },
    inject(dependencies, callback) {
      const missing = dependencies.filter((name) => services[name] === undefined)
      if (missing.length > 0) throw new Error(`ctx.inject waited for missing services: ${missing.join(', ')}`)
      callback(ctx)
      return undefined
    },
    effect(fn) {
      const off = fn()
      if (typeof off === 'function') calls.disposers.push(off)
    },
    on(name, listener) {
      if (name !== 'theme/change') return () => {}
      listeners.push(listener)
      return () => {
        const at = listeners.indexOf(listener)
        if (at >= 0) listeners.splice(at, 1)
      }
    },
  }
  return { calls, ctx, adoptDurable, observeLast }
}

function jsonResponse(value) {
  return { ok: true, status: 200, async json() { return value } }
}

/**
 * Every host element in a rendered tree, children and all. Reading the card
 * again after an interaction is what shows what the interaction changed.
 */
function nodesOf(element) {
  const found = []
  const walk = (node) => {
    if (node === null || node === undefined || typeof node === 'boolean') return
    if (typeof node === 'string' || typeof node === 'number') return
    if (Array.isArray(node)) {
      for (const child of node) walk(child)
      return
    }
    if (node.type === React.Fragment) {
      for (const child of node.children) walk(child)
      return
    }
    if (typeof node.type === 'function') {
      walk(node.type(node.props))
      return
    }
    found.push(node)
    for (const child of node.children) walk(child)
    const nested = node.props === undefined ? undefined : node.props.children
    if (nested !== undefined) walk(nested)
  }
  walk(element)
  return found
}

/** Render every registered component, children and all. */
function renderAll(calls, problems) {
  const rendered = []
  const nodes = []
  function renderNode(node) {
    if (node === null || node === undefined || typeof node === 'boolean') return
    if (typeof node === 'string' || typeof node === 'number') return
    if (Array.isArray(node)) {
      for (const child of node) renderNode(child)
      return
    }
    if (node.type === React.Fragment) {
      for (const child of node.children) renderNode(child)
      return
    }
    if (typeof node.type === 'function') {
      rendered.push(node.type.name || 'anonymous')
      renderNode(node.type(node.props))
      return
    }
    nodes.push(node)
    for (const child of node.children) renderNode(child)
    const nested = node.props === undefined ? undefined : node.props.children
    if (nested !== undefined) renderNode(nested)
  }

  for (const { options, component } of calls.registered) {
    if (typeof component !== 'function') continue
    try {
      renderNode(React.createElement(component, {}))
    } catch (error) {
      problems.push(`${options.name} "${options.id || options.key || ''}" threw on render: ${error.message}`)
    }
  }
  return { rendered, nodes }
}

/** Every string a component renders, for asserting what the card says. */
function textsOf(component) {
  const out = []
  const walk = (node) => {
    if (node === null || node === undefined || typeof node === 'boolean') return
    if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return }
    if (Array.isArray(node)) { for (const child of node) walk(child); return }
    if (typeof node.type === 'function') { walk(node.type(node.props)); return }
    for (const child of node.children) walk(child)
  }
  walk(React.createElement(component, {}))
  return out
}

async function runCase(pkg, testCase) {
  const { calls, ctx, adoptDurable, observeLast } = makeServices()
  calls.scheme = testCase.scheme === undefined ? 'dark' : testCase.scheme
  lastAudio = null
  store.clear()
  for (const [scheme, id] of Object.entries(testCase.stored === undefined ? {} : testCase.stored)) {
    store.set('omaseek.themes', JSON.stringify({ [scheme]: id }))
  }

  let stationCalls = 0
  globalThis.fetch = async (path) => {
    if (path === '/api/omaseek.themes') return jsonResponse(THEMES)
    // The station's catalogue, and the only route the music card asks for.
    if (path === '/api/omaseek.music.tracks') {
      stationCalls += 1
      // A station that was not there and came back: the first answer fails and
      // every later one is the catalogue the case named.
      if (testCase.stationRecovers === true && stationCalls === 1) {
        return { ok: false, status: 500, async json() { return { error: 'nope' } } }
      }
      if (testCase.tracks === null) return { ok: false, status: 500, async json() { return { error: 'nope' } } }
      // A host that does not have the route at all answers the way a real one
      // would: not found.
      if (testCase.tracks === 404) return { ok: false, status: 404, async json() { return {} } }
      if (testCase.tracks !== undefined) return jsonResponse(testCase.tracks)
      if (testCase.meta === undefined) return jsonResponse({ station: 'omarchy', name: 'Omarchy', tracks: [] })
      // A case that names `meta` is a catalogue with that one song in it.
      return jsonResponse({
        station: 'omarchy', name: 'Omarchy',
        tracks: [Object.assign({ file: 'track.mp3' }, testCase.meta)],
      })
    }
    return { ok: false, status: 404, async json() { return {} } }
  }

  const problems = []
  const externals = { react: React }
  const moduleExports = loaded.factory((id) => {
    if (id in externals) return externals[id]
    throw new Error(`${pkg.id}: the bundle asked the page for "${id}", which is not a client baseline module`)
  })
  if (typeof moduleExports.apply !== 'function') return { problems: ['the bundle exports no apply()'] }

  try {
    moduleExports.apply(ctx)
  } catch (error) {
    return { problems: [`apply() threw: ${error.message}`] }
  }

  await new Promise((done) => setTimeout(done, 20))

  const wanted = pkg.expect
  const expectedThemes = testCase.themes === undefined ? wanted.themes : testCase.themes
  if (expectedThemes !== undefined && calls.themeRegistrations.length !== expectedThemes) {
    problems.push(`registered ${calls.themeRegistrations.length} themes, expected ${expectedThemes}`)
  }
  for (const slot of wanted.sections) {
    if (!calls.sections.includes(slot)) problems.push(`no ${slot} registration`)
  }
  if (wanted.sectionLabel !== undefined) {
    const registered = calls.registered.filter((entry) => entry.options.name === 'settings.section')
    const labels = registered.map((entry) => entry.options.label)
    if (!labels.includes(wanted.sectionLabel)) {
      problems.push(`the settings page is called ${labels.join(', ') || 'nothing'}, expected ${wanted.sectionLabel}`)
    }
  }
  if (calls.overlays.length !== wanted.overlays) {
    problems.push(`registered ${calls.overlays.length} overlay cards, expected ${wanted.overlays}`)
  }
  if (calls.disposers.length === 0) problems.push('no owned effects were registered')

  if (testCase.applied !== undefined) {
    const applied = calls.themeSet.filter((id) => id.startsWith('omarchy-'))
    if (testCase.applied === null) {
      if (applied.length > 0) problems.push(`applied ${applied.join(', ')} where none was expected`)
    } else if (!applied.includes(testCase.applied)) {
      problems.push(`applied ${applied.length === 0 ? 'nothing' : applied.join(', ')}; expected ${testCase.applied}`)
    }
  }

  // The reset this Plugin exists to survive: ui-theme re-adopts its durable
  // preference because some other settings section was written, and every
  // listener hears that snapshot. Whoever is handed the LAST one is what `body`
  // ends up showing, so a repair that lands inside the dispatch loses.
  if (testCase.settingsWrite === true) {
    const painted = []
    observeLast((snapshot) => { painted.push(snapshot.active.id) })
    adoptDurable()
    await new Promise((done) => setTimeout(done, 5))
    const last = painted[painted.length - 1]
    if (last !== testCase.applied) {
      problems.push(`a settings write left "${last}" painted, expected "${testCase.applied}"`)
    }
  }

  const { rendered, nodes } = renderAll(calls, problems)

  /** The card as it is drawn right now, re-rendered from its own state. */
  const texts = () => {
    const card = calls.registered.find((entry) => entry.options.name === 'shell.overlay')
    return card === undefined ? [] : textsOf(card.component)
  }

  /**
   * Press a control the way the page would: find it by what it says it is and
   * call its handler. Next and prev are found the same way play is, so a
   * transport that lost its label fails here rather than passing quietly.
   */
  const press = (label, times) => {
    for (let i = 0; i < (times === undefined ? 1 : times); i += 1) {
      const control = nodes.find((node) => node.props['aria-label'] === label
        && typeof node.props.onClick === 'function')
      if (control === undefined) {
        problems.push(`no "${label}" control on the card`)
        return false
      }
      try {
        control.props.onClick()
      } catch (error) {
        problems.push(`pressing "${label}" threw: ${error.message}`)
        return false
      }
    }
    return true
  }

  // Press play the way the page would, with the media element answering or
  // failing, and check the card says something rather than sitting on
  // "loading" forever.
  audioMode = testCase.audio === undefined ? 'ok' : testCase.audio
  if (testCase.click !== undefined) press(testCase.click, testCase.clicks)
  if (testCase.play === true) {
    const play = nodes.find((node) => typeof node.props['aria-label'] === 'string'
      && node.props['aria-label'].indexOf('Play the track') === 0
      && typeof node.props.onClick === 'function')
    if (play === undefined) problems.push('no play control on the card')
    else {
      try {
        play.props.onClick()
      } catch (error) {
        problems.push(`pressing play threw: ${error.message}`)
      }
      await new Promise((done) => setTimeout(done, 30))
    }
  }

  // A pointer on the seek line, which is what swaps the byline to the clock.
  // The readout is painted by the frame loop rather than rendered by React, so
  // what is checked is the card's own flag: the thing the stylesheet hangs the
  // swap on, and the same thing the card sets for itself when `:has()` is not
  // there to do it.
  if (testCase.seekHover === true) {
    const line = nodes.find((node) => node.props['aria-label'] === 'Position in the track'
      && typeof node.props.onPointerEnter === 'function')
    if (line === undefined) problems.push('the seek line has no hover handler')
    else {
      try {
        line.props.onPointerEnter({})
      } catch (error) {
        problems.push(`hovering the seek line threw: ${error.message}`)
      }
      await new Promise((done) => setTimeout(done, 5))
      const card = calls.registered.find((entry) => entry.options.name === 'shell.overlay')
      const root = card === undefined ? undefined
        : nodesOf(React.createElement(card.component, {})).find((node) => node.props !== undefined
          && typeof node.props.className === 'string'
          && node.props.className.split(' ').includes('omamusic'))
      const flag = root === undefined ? undefined : root.props['data-seek']
      if (flag !== testCase.expectSeekFlag) {
        problems.push(`the card's seek flag is ${String(flag)}, expected ${String(testCase.expectSeekFlag)}`)
      }
    }
  }

  // A card that has never been dragged rests on the stylesheet's own bottom
  // anchor. The stored offset this replaced is what left the transport
  // off-screen once the card grew a row, so the absence of `top` is the point.
  if (testCase.expectResting !== undefined) {
    const card = calls.registered.find((entry) => entry.options.name === 'shell.overlay')
    const root = card === undefined ? undefined
      : nodesOf(React.createElement(card.component, {})).find((node) => node.props !== undefined
        && typeof node.props.className === 'string'
        && node.props.className.split(' ').includes('omamusic'))
    const style = root === undefined ? undefined : root.props.style
    if (style === undefined || style.bottom !== testCase.expectResting || style.top !== undefined) {
      problems.push(`the resting card is at ${JSON.stringify(style)}, `
        + `expected a bottom of ${testCase.expectResting} and no top`)
    }
  }

  // The song ran out under the card, which is a media event and not a press.
  if (testCase.end === true) {
    const element = lastAudio
    if (element === null) problems.push('no media element to end')
    else {
      element.emit('ended')
      await new Promise((done) => setTimeout(done, 30))
    }
  }

  // A press on the progress line, partway along it. The fake line is 200px
  // wide, so a press at 100 lands halfway through the song — which is what the
  // media element should have been sent to. The readout itself is painted by
  // the card's frame loop rather than rendered by React, so the position is
  // read off the element the card is actually driving.
  if (testCase.seekAt !== undefined) {
    const line = nodes.find((node) => node.props['aria-label'] === 'Position in the track'
      && typeof node.props.onClick === 'function')
    if (line === undefined) problems.push('no progress line on the card')
    else {
      if (lastAudio !== null) lastAudio.currentTime = 0
      const box = { width: 200, height: 14, left: 0, top: 0, right: 200, bottom: 14 }
      try {
        line.props.onClick({ clientX: testCase.seekAt, currentTarget: { max: '1000', getBoundingClientRect: () => box } })
      } catch (error) {
        problems.push(`pressing the progress line threw: ${error.message}`)
      }
      await new Promise((done) => setTimeout(done, 5))
      if (testCase.expectSeek !== undefined) {
        const landed = lastAudio === null ? null : lastAudio.currentTime
        if (landed !== testCase.expectSeek) {
          problems.push(`the press sought to ${landed}, expected ${testCase.expectSeek}`)
        }
      }
    }
  }

  if (testCase.expectFailure !== undefined) {
    const said = texts()
    if (testCase.expectFailure === null) {
      const wrong = said.filter((text) => /could not|No track is set|The station:/.test(text))
      if (wrong.length > 0) problems.push(`the card reports a failure it should not: ${wrong.join(', ')}`)
    } else if (!said.includes(testCase.expectFailure)) {
      problems.push(`the card does not say "${testCase.expectFailure}" (it says: ${said.join(' | ')})`)
    }
  }

  // Which song the card is on, read off the card rather than off the code.
  if (testCase.expectTrack !== undefined) {
    if (!texts().includes(testCase.expectTrack)) {
      problems.push(`the card is not on "${testCase.expectTrack}" (it says: ${texts().join(' | ')})`)
    }
  }

  // A string the card must be showing somewhere, badge or message.
  if (testCase.expectText !== undefined) {
    if (!texts().includes(testCase.expectText)) {
      problems.push(`the card does not show "${testCase.expectText}" (it says: ${texts().join(' | ')})`)
    }
  }

  // Teardown: every disposer the feature handed over must run clean, because a
  // throwing cleanup takes the plugin's unload with it.
  let torn = 0
  for (const dispose of [...calls.disposers].reverse()) {
    try {
      dispose()
      torn += 1
    } catch (error) {
      problems.push(`a disposer threw on teardown: ${error.message}`)
    }
  }
  return { problems, calls, rendered, torn }
}

/* ── run every package alone, then judge ───────────────────────────────── */

const failures = []
let checks = 0

for (const pkg of PACKAGES) {
  const bundlePath = resolve(REPO, pkg.dir, 'lib/client.js')
  if (!existsSync(bundlePath)) {
    failures.push({ label: pkg.label, problems: [`${pkg.dir}/lib/client.js is missing — run pnpm build`] })
    continue
  }
  const source = await readFile(bundlePath, 'utf8')
  loaded = null
  new Function('window', source)(windowStub)
  if (loaded === null) {
    failures.push({ label: pkg.label, problems: ['the bundle never called window.__ModuleLoader__.load'] })
    continue
  }
  if (loaded.id !== pkg.id) {
    failures.push({ label: pkg.label, problems: [`the bundle registered as "${loaded.id}", expected "${pkg.id}"`] })
    continue
  }

  for (const testCase of pkg.cases) {
    checks += 1
    const result = await runCase(pkg, testCase)
    if (result.problems.length > 0) {
      failures.push({ label: `${pkg.label} — ${testCase.label}`, problems: result.problems })
    } else {
      console.log(`omaseek: ${pkg.label}: ${testCase.label} ok — ${result.calls.registered.length} registrations, `
        + `${result.rendered.length} components rendered, ${result.torn} disposers run`)
    }
  }
}

if (failures.length > 0) {
  console.error('omaseek: browser half smoke test failed')
  for (const failure of failures) {
    console.error(`  ${failure.label}:`)
    for (const problem of failure.problems) console.error(`    - ${problem}`)
  }
  process.exit(1)
}
console.log(`omaseek: ${PACKAGES.length} packages, ${checks} cases, all green`)
