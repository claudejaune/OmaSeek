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

/**
 * Document listeners, so a case can fire the Omarchy Theme Sync extension's own
 * `omarchythemechange` the way its content script does. A case resets them, so
 * one case's subscription never answers another case's event.
 */
const documentListeners = new Map()
function fireDocument(type) {
  for (const listener of [...(documentListeners.get(type) || [])]) listener()
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
  addEventListener(type, listener) {
    if (!documentListeners.has(type)) documentListeners.set(type, [])
    documentListeners.get(type).push(listener)
  },
  removeEventListener(type, listener) {
    const list = documentListeners.get(type) || []
    const at = list.indexOf(listener)
    if (at >= 0) list.splice(at, 1)
  },
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

/**
 * The browser's colour scheme, as a case can flip it. `prefers-color-scheme` is
 * the only query whose answer this suite cares about; everything else — the
 * hero's reduced-motion and pointer queries — stays on the inert answer it had
 * before, because a real query's `matches` is whatever the engine says.
 */
const darkQuery = {
  media: '(prefers-color-scheme: dark)',
  matches: false,
  listeners: [],
  addEventListener(type, listener) { if (type === 'change') this.listeners.push(listener) },
  removeEventListener(type, listener) {
    const at = this.listeners.indexOf(listener)
    if (at >= 0) this.listeners.splice(at, 1)
  },
}
function setOsDark(next) {
  darkQuery.matches = next
  for (const listener of [...darkQuery.listeners]) listener({ matches: next })
}

// The loader facade lives on `window`, and module bodies reach the rest of the
// page through that same object — so the stubs and the facade are one value,
// and `window` inside the bundle is that value rather than a bare object.
let loaded = null
const windowStub = {
  __ModuleLoader__: { load(definition) { loaded = definition } },
  document: documentStub,
  matchMedia: (query) => (query === '(prefers-color-scheme: dark)'
    ? darkQuery
    : { matches: false, addEventListener() {}, removeEventListener() {} }),
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

/**
 * The `colors.toml` map the extension reports, as `colors()` hands it over. It
 * is the page's own state rather than the API's, because the extension re-reads
 * `<html>` on every call the way its page API does — a stub that captured the
 * palette at construction could not model a desktop switching underneath a live
 * page, which is the case the derivation exists for.
 */
let desktopColors = null

/**
 * `window.omarchy`, as the extension's own page API defines it: theme and mode
 * are read straight off `<html>`, which is the contract the extension documents
 * for every page it runs on. The plugin asks this object only whether the
 * extension is there at all, so a stub that lied about the attributes would be
 * a different extension than the one being followed.
 */
function makeOmarchyApi() {
  return {
    get theme() { return documentStub.documentElement.dataset.omarchyTheme || null },
    get mode() { return documentStub.documentElement.dataset.omarchyMode || null },
    colors: () => (desktopColors === null ? {} : desktopColors),
    onChange(handler) {
      documentStub.addEventListener('omarchythemechange', handler)
      return () => documentStub.removeEventListener('omarchythemechange', handler)
    },
  }
}

/** What the extension's content script writes: the two `<html>` attributes. */
function setDesktop(desktop) {
  if (desktop.theme !== undefined) documentStub.documentElement.dataset.omarchyTheme = desktop.theme
  if (desktop.mode !== undefined) documentStub.documentElement.dataset.omarchyMode = desktop.mode
}

/**
 * Two real `colors.toml` maps, lifted from the extension's own demo corpus
 * (`demo/themes.json`, whose 46 keys are the ones a desktop theme carries), one
 * per tone. They are here rather than invented for one reason: the derivation's
 * constants were fitted against Omarchy's 22 hand-tuned ports, so checking them
 * against colors a real theme actually uses is the closest thing to a desktop
 * this suite can have — the extension's native host, and `omarchy-theme-set`
 * with it, only exists on Omarchy.
 */
const DARK_COLORS = {
  accent: '#8275b7', background: '#06032b', bg: '#06032b', blue: '#8275b7',
  bright_blue: '#9787d9', bright_cyan: '#cde8ff', bright_fg: '#efebf9',
  bright_green: '#a1dbff', bright_magenta: '#dca7ff', bright_red: '#cd93d3',
  bright_yellow: '#ffc5ff', brown: '#715a74', color0: '#06032b', color1: '#b183b6',
  color10: '#a1dbff', color11: '#ffc5ff', color12: '#9787d9', color13: '#dca7ff',
  color14: '#cde8ff', color15: '#f7f3fe', color2: '#98c4ff', color3: '#ffceff',
  color4: '#8275b7', color5: '#c097e7', color6: '#bdd3ff', color7: '#eae4f7',
  color8: '#616369', color9: '#cd93d3', cursor: '#eae4f7', cyan: '#bdd3ff',
  dark_bg: '#050220', dark_fg: '#b0abb9', darker_bg: '#030216', fg: '#eae4f7',
  foreground: '#eae4f7', green: '#98c4ff', light_fg: '#ede8f8', lighter_bg: '#1f1c40',
  magenta: '#c097e7', muted: '#616369', orange: '#bd96c1', red: '#b183b6',
  selection: '#eae4f7', selection_background: '#eae4f7', selection_foreground: '#06032b',
  yellow: '#ffceff',
}

const LIGHT_COLORS = {
  accent: '#0073a1', background: '#faedf5', bg: '#faedf5', blue: '#5f6d84',
  bright_blue: '#425066', bright_cyan: '#005681', bright_fg: '#5b5f68',
  bright_green: '#41543a', bright_magenta: '#5c4b57', bright_red: '#574d50',
  bright_yellow: '#5a4c44', brown: '#443b35', color0: '#f4e7ef', color1: '#746a6d',
  color10: '#41543a', color11: '#5a4c44', color12: '#425066', color13: '#5c4b57',
  color14: '#005681', color15: '#353942', color2: '#5e7156', color3: '#786960',
  color4: '#5f6d84', color5: '#7a6874', color6: '#0073a1', color7: '#5b5f68',
  color8: '#8a8a8a', color9: '#574d50', cursor: '#434750', cyan: '#0073a1',
  dark_bg: '#f1e4ec', dark_fg: '#22262e', darker_bg: '#e9dce4', fg: '#434750',
  foreground: '#434750', green: '#5e7156', light_fg: '#4f535c', lighter_bg: '#fffcff',
  magenta: '#7a6874', muted: '#7e7d82', orange: '#766967', red: '#746a6d',
  selection: '#0073a1', selection_background: '#0073a1', selection_foreground: '#434750',
  yellow: '#786960',
}

/**
 * The palette `paletteFrom` must build out of `DARK_COLORS`, worked out by hand
 * from the same relations the module documents — the anchor slots straight off
 * the theme's keys, the rest at the fitted ratios. Written out rather than
 * recomputed here, or the test would only prove the module agrees with itself.
 */
const DARK_DERIVED = {
  '--dsw-alias-bg-base': '#06032b',
  '--dsw-alias-bg-layer-1': '#050220',
  '--dsw-alias-bg-layer-2': '#1f1c40',
  '--dsw-alias-bg-overlay': '#120f35',
  '--dsw-alias-border-l1': '#1b173d',
  '--dsw-alias-border-l2': '#4d496a',
  '--dsw-alias-brand-primary': '#8275b7',
  '--dsw-alias-label-primary': '#eae4f7',
  '--dsw-alias-label-secondary': '#c6c0d6',
  '--dsw-alias-label-tertiary': '#9c98b2',
  '--dsw-specific-brand-ink': '#0c0e10',
  '--dsw-specific-input-major': '#030216',
  '--dsw-alias-state-error-primary': '#b183b6',
  '--dsw-alias-state-success-primary': '#98c4ff',
  '--dsw-alias-state-warn-primary': '#ffceff',
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

/**
 * That placeholder palette with a few slots spelled for real. Only the theme
 * that has to prove a token *follows the palette* needs one: against fifteen
 * copies of `#123456` a token hard-wired to the placeholder and a token derived
 * from the brand are the same color, so the assertion would hold either way.
 */
function paletteWith(overrides) {
  return Object.assign(palette(), overrides)
}

const THEMES = {
  themes: [
    // Catppuccin's real success and error, which sit 132 degrees apart: the pair
    // a reader can already tell apart, and the one that must come through the
    // palette untouched.
    { id: 'catppuccin', name: 'Catppuccin', scheme: 'dark', palette: paletteWith({ error: '#f38ba8', success: '#a6e3a1' }) },
    { id: 'catppuccin-latte', name: 'Catppuccin Latte', scheme: 'light', palette: palette() },
    // Tokyo Night's real brand and text, because the send button's guard reads
    // them back: the fill must be the brand, and the hover the brand's step.
    { id: 'tokyo-night', name: 'Tokyo Night', scheme: 'dark', palette: paletteWith({ brand: '#9ece6a', text: '#c0caf5' }) },
    // The White theme's real pair: #2a2a2a against #3a3a3a, both near-black and
    // both neutral, which is the collapsed case in its purest form.
    { id: 'white', name: 'White', scheme: 'light', palette: paletteWith({ error: '#2a2a2a', success: '#3a3a3a' }) },
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
      // System with the Omarchy Theme Sync extension installed and reporting:
      // the scheme comes from the desktop's own colors.toml, and the palette is
      // this package's port of the theme Omarchy names with that slug. The chip
      // is renamed with it: "System" would name a browser this palette did not
      // come from, and its tooltip is what says so on hover.
      {
        label: 'System follows the desktop theme',
        scheme: 'system', extension: true, desktop: { theme: 'tokyo-night', mode: 'dark' },
        applied: 'omarchy-tokyo-night',
        chips: { Omarchy: true, Dark: false, Light: false },
        chipTitles: { Omarchy: 'Automatically change based on current Omarchy theme' },
        absentChips: ['System'],
        themes: 4,
      },
      // The label is the extension's, and only the extension's: a page without
      // Omarchy Theme Sync keeps the word System, and grows no tooltip with it.
      {
        label: 'without the extension the chip stays System, and carries no tooltip',
        scheme: 'system', applied: 'omarchy-catppuccin-latte',
        chips: { System: true, Light: false, Dark: false },
        chipTitles: { System: null },
        absentChips: ['Omarchy'],
        themes: 4,
      },
      // The desktop is on something this package has never heard of — a
      // community theme. Its light/dark is still followed; the palette is the
      // scheme's automatic one.
      {
        label: 'System follows the desktop mode when the theme is not one of ours',
        scheme: 'system', extension: true, desktop: { theme: 'someone-elses-theme', mode: 'dark' },
        applied: 'omarchy-catppuccin',
        themes: 4,
      },
      // A theme switch on the desktop arrives as a push from the extension's
      // native host, with no reload on this side. The mode moves with it.
      {
        label: 'a desktop switch repaints without a reload',
        scheme: 'system', extension: true, desktop: { theme: 'tokyo-night', mode: 'dark' },
        desktopAfter: { theme: 'catppuccin-latte', mode: 'light' },
        appliedLast: 'omarchy-catppuccin-latte',
        themes: 4,
      },
      // Light and Dark are the opt-out: the desktop is still reported, and is
      // not followed, because the reader asked for this scheme. The chip keeps
      // the extension's name either way — the extension is installed regardless.
      {
        label: 'a forced scheme ignores the desktop',
        scheme: 'dark', extension: true, desktop: { theme: 'catppuccin-latte', mode: 'light' },
        appliedLast: 'omarchy-catppuccin',
        chips: { Dark: true, Omarchy: false },
        themes: 4,
      },
      // The one the reader complained about, in the shape they complained
      // about: following the desktop, press a palette, and the chips have to
      // move with the press. A card is a choice of scheme as well as of colour
      // — the desktop does not drive a palette that was picked by hand, so
      // leaving the follow chip lit would claim it still did.
      {
        label: 'a card pressed while following moves the scheme off the follow chip',
        scheme: 'system', extension: true, desktop: { theme: 'tokyo-night', mode: 'dark' },
        pressCard: 'Catppuccin',
        appliedLast: 'omarchy-catppuccin',
        chips: { Dark: true, Omarchy: false },
        themes: 4,
      },
      // Pressing the card that is already in force — while following, that is
      // the desktop's own theme — is not a choice and must not quietly stop the
      // following: the way pressing the current item anywhere else does nothing.
      {
        label: 'pressing the desktop theme itself keeps following it',
        scheme: 'system', extension: true, desktop: { theme: 'tokyo-night', mode: 'dark' },
        pressCard: 'Tokyo Night',
        appliedLast: 'omarchy-tokyo-night',
        chips: { Omarchy: true, Dark: false },
        themes: 4,
      },
      // And the press is durable, not just this page: the harness's own
      // settings take light/dark/system, so what is written there is Dark.
      // A reload then comes back on Dark with the pick still in force.
      {
        label: 'the scheme a card press chose is the one remembered',
        scheme: 'dark', stored: { dark: 'omarchy-catppuccin', mode: 'dark' },
        extension: true, desktop: { theme: 'tokyo-night', mode: 'dark' },
        appliedLast: 'omarchy-catppuccin',
        chips: { Dark: true, Omarchy: false },
        themes: 4,
      },
      // A slot picked back when a card press left System lit is a scheme
      // statement too, and a reload is where that is mended: the chips come
      // back on the scheme the pick belongs to. (Written by the first cut of
      // following the desktop, which shipped nowhere.)
      {
        label: 'a pick stored under System comes back on its own scheme',
        scheme: 'system', stored: { dark: 'omarchy-tokyo-night', mode: 'system' },
        extension: true, desktop: { theme: 'nord', mode: 'dark' },
        appliedLast: 'omarchy-tokyo-night',
        chips: { Dark: true, Omarchy: false },
        themes: 4,
      },
      // Installed but silent — a native host that is down. The first paint is
      // held for the grace window and then falls back to the OS scheme, rather
      // than waiting forever on a palette that is not coming. There is no theme
      // name to follow and no palette to derive from, so the count line is the
      // only place that can say the extension has not answered.
      {
        label: 'an extension that reports nothing falls back to the OS scheme',
        scheme: 'system', extension: true, grace: true,
        applied: 'omarchy-catppuccin-latte',
        expectSectionText: 'Omarchy Theme Sync has not reported a theme',
        themes: 4,
      },
      // The OS scheme flipping while System follows nothing else: the harness
      // stops watching it itself once a palette is pinned, so this Plugin has
      // to, or System would only follow the OS on the next reload.
      {
        label: 'System with no desktop follows an OS scheme flip live',
        scheme: 'system', osFlip: true,
        applied: 'omarchy-catppuccin-latte', appliedLast: 'omarchy-catppuccin',
        themes: 4,
      },
      // A community theme: installed on the desktop, no port here, and its own
      // colors.toml carried on the page. The harness wears the desktop's own
      // palette rather than falling back to Catppuccin, and the section has
      // nothing to explain because nothing is wrong.
      {
        label: 'a desktop theme with no port is painted from its own colors',
        scheme: 'system', extension: true,
        desktop: { theme: 'someone-elses-theme', mode: 'dark' },
        colors: DARK_COLORS,
        applied: 'omaseek-desktop-someone-elses-theme-dark',
        registration: {
          id: 'omaseek-desktop-someone-elses-theme-dark',
          scheme: 'dark',
          tokens: DARK_DERIVED,
        },
        themes: 5,
      },
      // The same desktop theme on a page that came up in the light: the colors
      // are the theme's, and the mode is the desktop's, so the derived theme
      // declares the scheme it was read under.
      {
        label: 'a light community theme is derived under its own scheme',
        scheme: 'system', extension: true,
        desktop: { theme: 'moonlit-castle', mode: 'light' },
        colors: LIGHT_COLORS,
        applied: 'omaseek-desktop-moonlit-castle-light',
        registration: {
          id: 'omaseek-desktop-moonlit-castle-light',
          scheme: 'light',
          tokens: {
            '--dsw-alias-bg-base': '#faedf5',
            '--dsw-alias-bg-layer-1': '#f1e4ec',
            '--dsw-alias-bg-layer-2': '#fffcff',
            '--dsw-alias-brand-primary': '#0073a1',
            '--dsw-alias-label-primary': '#434750',
            '--dsw-alias-state-error-primary': '#746a6d',
          },
        },
        themes: 5,
      },
      // A port beats a derivation wherever one exists: the hand-tuned 22 are a
      // judgement about the theme that reading its colors back cannot reproduce.
      // Tokyo Night is ported, so its own port is what is painted, and no
      // second theme is registered for it.
      {
        label: 'a ported desktop theme still uses its port, not its colors',
        scheme: 'system', extension: true,
        desktop: { theme: 'tokyo-night', mode: 'dark' },
        colors: DARK_COLORS,
        applied: 'omarchy-tokyo-night',
        themes: 4,
      },
      // An error colour a reader cannot tell from the success colour is turned
      // red. The White theme is the case in its purest form: #2a2a2a against
      // #3a3a3a, two near-blacks with no hue between them at all. The red is
      // solved back to the original's brightness (#2a2a2a and #4d1717 have the
      // same relative luminance), so the theme's contrast survives the change.
      {
        label: 'an error that reads as the success colour is turned red',
        scheme: 'dark',
        registration: {
          id: 'omarchy-white',
          tokens: { '--dsw-alias-state-error-primary': '#4d1717' },
        },
        themes: 4,
      },
      // And the pair that already works is not touched: Catppuccin's #f38ba8 and
      // #a6e3a1 are 132 degrees apart, which is the whole point of a guard that
      // only fires on the five that need it.
      {
        label: 'an error that already reads apart keeps the theme colour',
        scheme: 'dark',
        registration: {
          id: 'omarchy-catppuccin',
          tokens: { '--dsw-alias-state-error-primary': '#f38ba8' },
        },
        themes: 4,
      },
      // The send/stop button paints with the shell's *info* fill — a
      // static DeepSeek blue that no palette can reach — so the one button a
      // reader presses most was the one button a theme could not colour. Every
      // other primary button in the shell derives from `brand-primary`; this one
      // had to be given the brand explicitly. Asserted as tokens rather than as a
      // class-qualified rule, because that is exactly what regressed: the rule
      // this replaced matched a CSS-module hash that a harness rebuild renamed,
      // and the button silently went back to blue.
      {
        label: 'the send button wears the brand, not the shell blue',
        scheme: 'dark',
        registration: {
          id: 'omarchy-tokyo-night',
          tokens: {
            '--dsw-alias-button-info-fill': '#9ece6a',
            '--dsw-alias-button-info-hover': '#a3cd7d',
          },
        },
        themes: 4,
      },
      // The one case left that cannot be painted: a desktop theme with no port
      // whose colors never arrived — a native host that never answered. The
      // automatic pair stands in, and the count line says why rather than
      // letting the picker look like it ignored the desktop.
      {
        label: 'a desktop theme whose colors will not read says so',
        scheme: 'system', extension: true,
        desktop: { theme: 'ghost-theme', mode: 'dark' },
        applied: 'omarchy-catppuccin',
        expectSectionText: 'the desktop theme "ghost-theme" reported no colors',
        themes: 4,
      },
      // And a desktop switch rewrites none of it: the new theme is derived and
      // registered, the old registration is left alone rather than disposed,
      // and the palette moves without a reload. Two registrations, because the
      // switch is a second theme and not an edit of the first.
      {
        label: 'an unported desktop switch derives the next theme live',
        scheme: 'system', extension: true,
        desktop: { theme: 'someone-elses-theme', mode: 'dark' },
        desktopAfter: { theme: 'another-theme', mode: 'dark' },
        colors: DARK_COLORS,
        applied: 'omaseek-desktop-someone-elses-theme-dark',
        appliedLast: 'omaseek-desktop-another-theme-dark',
        themes: 6,
      },
    ],
  },
  {
    dir: 'packages/omaseek-pixel',
    id: 'omaseek-pixel',
    label: 'OmaPixel (hero)',
    expect: { sections: ['settings.section'], overlays: 0, themes: 0 },
    cases: [
      { label: 'the hero section', scheme: 'dark' },
      {
        // The section's two switches are the reader's, not the page's: what was
        // left on is what is drawn on when the page comes back.
        label: 'the switches come back as they were left',
        scheme: 'dark', pixel: { field: 'off', typing: 'once' },
        expectActive: ['Off', 'Once'],
      },
      {
        // And a press is written where the next page load will find it.
        label: 'a press is remembered',
        scheme: 'dark', pressChip: 'Off',
        expectStored: { field: 'off', typing: 'loop' },
      },
    ],
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
      {
        // The rail shuts the card to its mark, and takes prev and next out of
        // the flow with it — a shut card has one button, and it is the one
        // that matters.
        label: 'the rail shuts the card to its mark',
        tracks: STATION, rail: true, expectShut: '1', expectTransport: '0',
      },
      {
        // A card left shut comes back shut, and the rail opens it: the width
        // goes at once, the two outer buttons only once the slide is over.
        label: 'a shut card comes back shut, and opens whole',
        tracks: STATION, shut: true, rail: true, expectShut: '0', expectTransport: '1',
      },
      {
        // A song left partway comes back partway. The remembered length is
        // what lets the line and the readout be right before the real one
        // arrives, and the spot is carried to `loadedmetadata` rather than
        // trusted to a silent clock that still reads zero until then.
        label: 'a song left partway comes back partway',
        tracks: STATION, play: true, audio: 'ok',
        remembered: { file: 'second-song.mp3', position: 95, duration: 210 },
        expectTrack: 'Second Song', expectResumeNear: 95,
      },
      {
        // A song the station no longer has is not an error and says nothing:
        // the card is simply at the top of the list, where it would have
        // been anyway.
        label: 'a remembered song that is gone leaves the card at the top',
        tracks: STATION,
        remembered: { file: 'gone-song.mp3', position: 120, duration: 200 },
        expectTrack: 'First Song',
      },
      {
        // A card that was dragged comes back where the hand left it, placed by
        // number instead of resting on the stylesheet's bottom anchor.
        label: 'a dragged card comes back where it was left',
        tracks: STATION, spot: { left: 480, top: 220 },
        expectPlaced: { left: 480, top: 220 },
      },
      {
        // A spot remembered with a broken number is no spot at all: the card
        // rests on the stylesheet's anchor rather than going nowhere.
        label: 'a broken remembered spot falls back to resting',
        tracks: STATION, spot: { left: 'nowhere', top: null },
        expectResting: '8px',
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
  // Undefined until something writes a preference, so the case's own scheme is
  // what the Service reports: that is the durable preference `adopt()` puts
  // there, and the stub has to model it or a Plugin reading the preference
  // instead of the resolved palette would see a harness nobody runs.
  let preference
  let activeId = 'dark'
  const snapshot = () => ({
    preference: preference === undefined ? calls.scheme : preference,
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
      // The real Service throws on a duplicate id, and the derived desktop
      // themes are registered exactly once each for that reason — a cache that
      // forgot would fail here rather than quietly shadowing a registration.
      if (schemeOf.has(definition.id)) {
        throw new Error(`theme "${definition.id}" is already registered`)
      }
      calls.themeRegistrations.push(definition)
      schemeOf.set(definition.id, definition.colorScheme)
      return () => {
        // Disposing the theme backing the active preference resets it to the
        // default. That is why a desktop switch registers a new theme and
        // leaves the old one registered; modelled so the hazard is visible if
        // anything ever starts disposing them.
        schemeOf.delete(definition.id)
        if (activeId === definition.id) activeId = 'dark'
        if (preference === definition.id) preference = undefined
      }
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

/** Whether a rendered subtree contains this exact string. */
function hasText(node, text) {
  if (node === null || node === undefined || typeof node === 'boolean') return false
  if (typeof node === 'string' || typeof node === 'number') return String(node) === text
  if (Array.isArray(node)) return node.some((child) => hasText(child, text))
  if (typeof node.type === 'function') return hasText(node.type(node.props), text)
  if (node.children.some((child) => hasText(child, text))) return true
  const nested = node.props === undefined ? undefined : node.props.children
  return nested === undefined ? false : hasText(nested, text)
}

/** One of the settings page's chips, found by the word on it. */
function chipSaying(nodes, label) {
  return nodes.find((node) => typeof node.props.className === 'string'
    && node.props.className.split(' ').includes('omaseek-chip')
    && hasText(node, label))
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

/**
 * Whether a theme id is one this Package registered — a port of one of the 22,
 * or a palette derived from the desktop's own colors. The distinction matters
 * because `setTheme()` is also called with the harness's own `light`/`dark`/
 * `system`, and those are not palettes this Package painted.
 */
const isOurs = (id) => id.startsWith('omarchy-') || id.startsWith('omaseek-desktop-')

async function runCase(pkg, testCase) {
  const { calls, ctx, adoptDurable, observeLast } = makeServices()
  calls.scheme = testCase.scheme === undefined ? 'dark' : testCase.scheme
  lastAudio = null
  store.clear()
  // The page as this case finds it: no listeners from the last one, no desktop
  // reported, and the extension present only where a case says so.
  documentListeners.clear()
  darkQuery.matches = false
  darkQuery.listeners.length = 0
  delete windowStub.omarchy
  delete documentStub.documentElement.dataset.omarchyTheme
  delete documentStub.documentElement.dataset.omarchyMode
  // No colors until a case supplies them: an extension that is installed but
  // has reported nothing is the state a page boots into, and the one the
  // derivation has to survive.
  desktopColors = null
  if (testCase.extension === true) windowStub.omarchy = makeOmarchyApi()
  if (testCase.desktop !== undefined) setDesktop(testCase.desktop)
  if (testCase.colors !== undefined) desktopColors = testCase.colors
  if (testCase.osDark === true) darkQuery.matches = true

  // What the picker remembered: one slot per scheme, and the mirrored
  // preference. Assembled as one object, because each of these writes the same
  // key and a second `set` would erase the first.
  const choices = {}
  for (const [scheme, id] of Object.entries(testCase.stored === undefined ? {} : testCase.stored)) {
    choices[scheme] = id
  }
  if (Object.keys(choices).length > 0) store.set('omaseek.themes', JSON.stringify(choices))
  // OmaPixel's two switches, as a reader left them before this page load.
  if (testCase.pixel !== undefined) store.set('omaseek.pixel', JSON.stringify(testCase.pixel))
  // What the last page left in `omaseek.music`: the fold, the song, and the
  // spot the card was dragged to. Assembled as one object, because each of
  // these writes the same key and a second `set` would erase the first.
  const music = {}
  if (testCase.shut !== undefined) music.collapsed = testCase.shut
  if (testCase.remembered !== undefined) music.track = testCase.remembered
  if (testCase.spot !== undefined) music.position = testCase.spot
  if (Object.keys(music).length > 0) store.set('omaseek.music', JSON.stringify(music))

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

  // A desktop that reports after the page is up. The extension answers a fresh
  // page from its own cache, but the palette can still land after this Plugin
  // has resolved its scheme — and the swap has to arrive without a reload.
  if (testCase.desktopAfter !== undefined) {
    setDesktop(testCase.desktopAfter)
    fireDocument('omarchythemechange')
    await new Promise((done) => setTimeout(done, 25))
  }

  // An extension that is installed and has reported nothing yet: the first
  // paint is held briefly rather than the OS scheme being shown and repainted
  // over, and the fallback has to arrive once the hold runs out. The hold is
  // the point, so nothing may have been applied while it lasts.
  if (testCase.grace === true) {
    const early = calls.themeSet.filter(isOurs)
    if (early.length > 0) problems.push(`painted ${early.join(', ')} while holding for the desktop`)
    await new Promise((done) => setTimeout(done, 600))
  }

  // The OS scheme flipping, which is what System follows when the desktop says
  // nothing: the harness itself stops listening once a palette is pinned, so
  // this Plugin has to or System would only follow the OS on the next reload.
  if (testCase.osFlip === true) {
    setOsDark(true)
    await new Promise((done) => setTimeout(done, 25))
  }

  // A press on one of the section's own theme cards, which is the interaction
  // that decides a scheme: the palette is the reader's, and so is the chip.
  if (testCase.pressCard !== undefined) {
    const section = calls.registered.find((entry) => entry.options.name === 'settings.section')
    const cards = section === undefined ? [] : nodesOf(React.createElement(section.component, {}))
    const card = cards.find((node) => typeof node.props.className === 'string'
      && node.props.className.split(' ').includes('omaseek-card') && hasText(node, testCase.pressCard))
    if (card === undefined) problems.push(`no "${testCase.pressCard}" card on the settings page`)
    else {
      try {
        card.props.onClick()
      } catch (error) {
        problems.push(`pressing "${testCase.pressCard}" threw: ${error.message}`)
      }
    }
    await new Promise((done) => setTimeout(done, 10))
  }

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
    const applied = calls.themeSet.filter(isOurs)
    if (testCase.applied === null) {
      if (applied.length > 0) problems.push(`applied ${applied.join(', ')} where none was expected`)
    } else if (!applied.includes(testCase.applied)) {
      problems.push(`applied ${applied.length === 0 ? 'nothing' : applied.join(', ')}; expected ${testCase.applied}`)
    }
  }

  // What is in force at the end, which is the half a sequence of palette
  // switches can get wrong while every id in it was applied along the way.
  if (testCase.appliedLast !== undefined) {
    const applied = calls.themeSet.filter(isOurs)
    const last = applied[applied.length - 1]
    if (last !== testCase.appliedLast) {
      problems.push(`left "${last}" in force, expected "${testCase.appliedLast}"`)
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

  // A theme a case expects this Package to have registered, checked through the
  // definition the harness actually received — so a mapping is verified end to
  // end, and a module that built the right palette but handed over the wrong
  // tokens cannot pass by agreeing with itself.
  if (testCase.registration !== undefined) {
    const definition = calls.themeRegistrations.find((one) => one.id === testCase.registration.id)
    if (definition === undefined) {
      problems.push(`no theme "${testCase.registration.id}" was registered`
        + ` — got ${JSON.stringify(calls.themeRegistrations.map((one) => one.id))}`)
    } else {
      if (testCase.registration.scheme !== undefined
        && definition.colorScheme !== testCase.registration.scheme) {
        problems.push(`theme declares ${definition.colorScheme}, expected ${testCase.registration.scheme}`)
      }
      for (const [token, value] of Object.entries(testCase.registration.tokens === undefined ? {} : testCase.registration.tokens)) {
        if (definition.tokens[token] !== value) {
          problems.push(`the ${token} of ${testCase.registration.id} is ${JSON.stringify(definition.tokens[token])},`
            + ` expected ${JSON.stringify(value)}`)
        }
      }
    }
  }

  // What the section says that no control carries. The count line's desktop
  // note is the only one left, and it is the whole explanation a reader gets
  // when the desktop's colors could not be read.
  if (testCase.expectSectionText !== undefined) {
    const section = calls.registered.find((entry) => entry.options.name === 'settings.section')
    const said = section === undefined ? [] : textsOf(section.component)
    if (!said.some((text) => text.includes(testCase.expectSectionText))) {
      problems.push(`the settings page does not say ${JSON.stringify(testCase.expectSectionText)}`
        + ` — it says ${JSON.stringify(said.filter((text) => text.length > 30))}`)
    }
  }

  // Which scheme chips are lit. A chip left on the follow scheme over a palette
  // the desktop no longer drives is the lie this asserts against.
  for (const [label, lit] of Object.entries(testCase.chips === undefined ? {} : testCase.chips)) {
    const chip = chipSaying(nodes, label)
    if (chip === undefined) problems.push(`no "${label}" chip on the settings page`)
    else if ((chip.props['data-on'] === '1') !== lit) {
      problems.push(`the "${label}" chip is ${chip.props['data-on'] === '1' ? 'lit' : 'dark'},`
        + ` expected ${lit ? 'lit' : 'dark'}`)
    }
  }

  // What a chip says on hover. The follow chip is renamed for the extension, and
  // its tooltip is the only place left that spells out what the rename means, so
  // a null here asserts the absence of one rather than skipping the check.
  for (const [label, tip] of Object.entries(testCase.chipTitles === undefined ? {} : testCase.chipTitles)) {
    const chip = chipSaying(nodes, label)
    if (chip === undefined) problems.push(`no "${label}" chip on the settings page`)
    else {
      const actual = chip.props.title === undefined ? null : chip.props.title
      if (actual !== tip) {
        problems.push(`the "${label}" chip's tooltip is ${JSON.stringify(actual)},`
          + ` expected ${JSON.stringify(tip)}`)
      }
    }
  }

  // The other half of a rename: the word that is no longer there.
  for (const label of testCase.absentChips === undefined ? [] : testCase.absentChips) {
    if (chipSaying(nodes, label) !== undefined) {
      problems.push(`the settings page still shows a "${label}" chip`)
    }
  }

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
    // The transport's middle button, found by its class rather than its
    // label: that label toggles between Play and Pause depending on the
    // state the card is already in, and the class does not. (The artwork used
    // to be a play control too, and this looked for its label; it is a plain
    // plate now, and the transport is the only thing that plays.)
    const play = nodes.find((node) => typeof node.props.className === 'string'
      && node.props.className.split(' ').includes('omamusic-tb-play')
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

  // A press on the rail down the card's right edge, which shuts it to its
  // mark or opens it again. The label says which way the press will go, so
  // the same action serves both directions.
  if (testCase.rail === true) {
    const rail = nodes.find((node) => typeof node.props['aria-label'] === 'string'
      && (node.props['aria-label'] === 'Collapse the player'
        || node.props['aria-label'] === 'Expand the player')
      && typeof node.props.onClick === 'function')
    if (rail === undefined) problems.push('no collapse rail on the card')
    else {
      try {
        rail.props.onClick()
      } catch (error) {
        problems.push(`pressing the rail threw: ${error.message}`)
      }
      await new Promise((done) => setTimeout(done, 5))
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

  // The rail's two flags. They are deliberately not the same thing on the way
  // out: prev and next leave the flow with the first frame of a collapse and
  // come back only once the card has finished widening, so a case that reads
  // them waits out the slide rather than catching the card mid-animation.
  if (testCase.expectShut !== undefined || testCase.expectTransport !== undefined) {
    if (testCase.expectTransport !== undefined) {
      await new Promise((done) => setTimeout(done, 260))
    }
    const card = calls.registered.find((entry) => entry.options.name === 'shell.overlay')
    const rendered = card === undefined ? [] : nodesOf(React.createElement(card.component, {}))
    const named = (name) => rendered.find((node) => node.props !== undefined
      && typeof node.props.className === 'string'
      && node.props.className.split(' ').includes(name))
    const root = named('omamusic')
    const shut = root === undefined ? undefined : root.props['data-collapsed']
    if (testCase.expectShut !== undefined && shut !== testCase.expectShut) {
      problems.push(`the card's collapse flag is ${String(shut)}, expected ${String(testCase.expectShut)}`)
    }
    if (testCase.expectTransport !== undefined) {
      const transport = named('omamusic-transport')
      const full = transport === undefined ? undefined : transport.props['data-full']
      if (full !== testCase.expectTransport) {
        problems.push(`the transport is ${String(full)}, expected ${String(testCase.expectTransport)}`)
      }
    }
  }

  // A card that was dragged comes back placed by number, not resting on the
  // stylesheet's bottom anchor. The clamp that keeps a remembered spot inside
  // a window that has since shrunk reads the card's real box, which this
  // harness never mounts, so what is checked here is the restore itself.
  if (testCase.expectPlaced !== undefined) {
    const card = calls.registered.find((entry) => entry.options.name === 'shell.overlay')
    const root = card === undefined ? undefined
      : nodesOf(React.createElement(card.component, {})).find((node) => node.props !== undefined
        && typeof node.props.className === 'string'
        && node.props.className.split(' ').includes('omamusic'))
    const style = root === undefined ? undefined : root.props.style
    const want = testCase.expectPlaced
    if (style === undefined || style.left !== `${want.left}px` || style.top !== `${want.top}px`
      || style.bottom !== undefined) {
      problems.push(`the card is placed at ${JSON.stringify(style)}, `
        + `expected ${want.left}px / ${want.top}px and no bottom`)
    }
  }

  // Where a remembered card picked up. Read off the element rather than the
  // readout, which the frame loop paints and the smoke harness never runs.
  // A second of slack: the silent clock has been running since the restore,
  // so the spot lands a few milliseconds past where it was written.
  if (testCase.expectResumeNear !== undefined) {
    const landed = lastAudio === null ? null : lastAudio.currentTime
    if (landed === null || Math.abs(landed - testCase.expectResumeNear) > 1) {
      problems.push(`the card resumed at ${String(landed)}, `
        + `expected within a second of ${testCase.expectResumeNear}`)
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

  // A section whose switches are the reader's: the remembered values are the
  // ones drawn as on, a press is written where the next load looks for it, and
  // the two are checked separately so a section that reads but never writes
  // fails on the write rather than passing on the read.
  if (testCase.expectActive !== undefined) {
    const on = nodes.filter((node) => typeof node.props.className === 'string'
      && node.props.className.split(' ').includes('omapixel-chip')
      && node.props['data-on'] === '1')
      .map((node) => String(node.children[0])).sort()
    const wanted = [...testCase.expectActive].sort()
    if (on.join(',') !== wanted.join(',')) {
      problems.push(`the switches read ${on.join(', ') || 'none'}, expected ${wanted.join(', ')}`)
    }
  }

  if (testCase.pressChip !== undefined) {
    const chip = nodes.find((node) => typeof node.props.className === 'string'
      && node.props.className.split(' ').includes('omapixel-chip')
      && node.children[0] === testCase.pressChip
      && typeof node.props.onClick === 'function')
    if (chip === undefined) problems.push(`no "${testCase.pressChip}" chip on the page`)
    else {
      try {
        chip.props.onClick()
      } catch (error) {
        problems.push(`pressing "${testCase.pressChip}" threw: ${error.message}`)
      }
    }
  }

  if (testCase.expectStored !== undefined) {
    const raw = store.get('omaseek.pixel')
    const held = raw === undefined ? undefined : JSON.parse(raw)
    if (JSON.stringify(held) !== JSON.stringify(testCase.expectStored)) {
      problems.push(`the switches were remembered as ${raw === undefined ? 'nothing' : raw}, `
        + `expected ${JSON.stringify(testCase.expectStored)}`)
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
