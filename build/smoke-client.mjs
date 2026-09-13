#!/usr/bin/env node
/**
 * Execute the built browser half the way the page will, under stubs.
 *
 * `node --check` only proves the bundle parses, and the server-side checks only
 * prove it is *served*. Neither runs a module body, so neither can see a name
 * that was never bound — an import rewritten into a nested block, say. This
 * evaluates the bundle, hands `apply` a fake Cordis context whose services and
 * slots answer, renders every component the features registered, and then runs
 * every disposer they returned. It runs on every `pnpm check`.
 *
 * Three hosts are exercised, because the failure paths are where this package
 * has actually broken: a healthy one, one with no music file (the meta route
 * answers `timeline: null`), and one whose route rejects outright. Each must
 * apply, render and tear down without throwing.
 *
 * It is not a browser, and the stub React is not React: hooks have no order,
 * no re-render and no dependency comparison, so a hook-rule violation or an
 * update-path bug passes here. What it does cover is module-graph binding,
 * apply surviving the services it asks for, first-render crashes on every host
 * shape, and teardown that throws.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

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
    getBoundingClientRect() { return { width: 0, height: 0, left: 0, top: 0, right: 0, bottom: 0 } },
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

// The loader facade lives on `window`, and module bodies reach the rest of the
// page through that same object — so the stubs and the facade are one value,
// and `window` inside the bundle is that value rather than a bare object.
let loaded = null
/** Backing store for the localStorage stub; reset per scenario. */
const store = new Map()
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
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)) },
    removeItem: (key) => { store.delete(key) },
  },
  navigator: { userAgent: 'smoke' },
}

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

const HOSTS = [
  {
    label: 'healthy host',
    themes: THEMES,
    meta: { title: 'T', artist: 'A', size: 4096, art: '', timeline: TIMELINE, icons: null },
    expectThemes: 4,
    scheme: 'dark',
    // Nobody has chosen: the dark UI opens on Catppuccin.
    expectApplied: 'omarchy-catppuccin',
  },
  {
    label: 'host with no music file',
    themes: THEMES,
    meta: { title: 'T', artist: 'A', size: 0, art: '', timeline: null, icons: null },
    expectThemes: 4,
    scheme: 'dark',
    expectApplied: 'omarchy-catppuccin',
  },
  {
    label: 'host whose music route fails',
    themes: THEMES,
    meta: null,
    expectThemes: 4,
    scheme: 'dark',
    expectApplied: 'omarchy-catppuccin',
  },
  {
    label: 'light scheme',
    themes: THEMES,
    meta: { title: 'T', artist: 'A', size: 0, art: '', timeline: null, icons: null },
    expectThemes: 4,
    scheme: 'light',
    // …and a light one on Catppuccin Latte.
    expectApplied: 'omarchy-catppuccin-latte',
  },
  {
    label: 'remembered choice',
    themes: THEMES,
    meta: { title: 'T', artist: 'A', size: 0, art: '', timeline: null, icons: null },
    expectThemes: 4,
    scheme: 'dark',
    stored: { dark: 'omarchy-tokyo-night' },
    // The stored palette wins over the automatic one.
    expectApplied: 'omarchy-tokyo-night',
  },
  {
    label: 'own track with no timeline',
    themes: THEMES,
    // A file of your own with no analysed spectrum beside it: playable, and the
    // card must not treat the missing timeline as a missing track.
    meta: { title: 'T', artist: 'A', size: 4096, art: '', timeline: null, icons: null },
    expectThemes: 4,
    scheme: 'dark',
    expectApplied: 'omarchy-catppuccin',
  },
  {
    label: 'remembered opt-out',
    themes: THEMES,
    meta: { title: 'T', artist: 'A', size: 0, art: '', timeline: null, icons: null },
    expectThemes: 4,
    scheme: 'dark',
    stored: { dark: 'base' },
    // `base` means the harness palette: nothing is applied at all.
    expectApplied: null,
  },
]

/* ── one page load ─────────────────────────────────────────────────────── */

/** Every service the features read, plus a log of what they did with them. */
function makeServices() {
  const calls = { registered: [], sections: [], overlays: [], themeRegistrations: [], disposers: [], themeSet: [] }

  const themeService = {
    register(definition) { calls.themeRegistrations.push(definition); return () => {} },
    getTheme() {
      return { active: { id: 'dark', colorScheme: calls.scheme }, preference: 'system' }
    },
    setTheme(id) { calls.themeSet.push(id) },
  }

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
    on() { return () => {} },
  }
  return { calls, ctx }
}

function jsonResponse(value) {
  return { ok: true, status: 200, async json() { return value } }
}

/** Load the bundle once — each factory call is a fresh module graph. */
const source = await readFile(resolve(ROOT, 'lib/client.js'), 'utf8')
new Function('window', source)(windowStub)
if (loaded === null) throw new Error('omaseek: bundle never called window.__ModuleLoader__.load')
if (loaded.id !== 'omaseek') throw new Error(`omaseek: bundle registered as "${loaded.id}"`)

async function runHost(host) {
  const { calls, ctx } = makeServices()
  calls.scheme = host.scheme
  store.clear()
  for (const [scheme, id] of Object.entries(host.stored === undefined ? {} : host.stored)) {
    store.set('omaseek.themes', JSON.stringify({ [scheme]: id }))
  }

  globalThis.fetch = async (path) => {
    if (path === '/api/omaseek.themes') return jsonResponse(host.themes)
    if (path === '/api/omaseek.music.meta') {
      if (host.meta === null) return { ok: false, status: 500, async json() { return { error: 'nope' } } }
      return jsonResponse(host.meta)
    }
    return { ok: false, status: 404, async json() { return {} } }
  }

  const externals = { react: React }
  const moduleExports = loaded.factory((id) => {
    if (id in externals) return externals[id]
    throw new Error(`omaseek: bundle asked the page for "${id}", which is not a client baseline module`)
  })
  if (typeof moduleExports.apply !== 'function') throw new Error('omaseek: bundle exports no apply()')

  const problems = []
  try {
    moduleExports.apply(ctx)
  } catch (error) {
    return { problems: [`apply() threw: ${error.message}`], calls }
  }

  // The theme table arrives over the fetch bridge, so the registrations land a
  // microtask later — wait for them instead of racing the assertions below.
  await new Promise((done) => setTimeout(done, 20))

  if (calls.themeRegistrations.length !== host.expectThemes) {
    problems.push(`registered ${calls.themeRegistrations.length} themes, expected ${host.expectThemes}`)
  }
  if (!calls.sections.includes('settings.section')) problems.push('no settings.section registration')
  if (!calls.sections.includes('shell.overlay')) problems.push('no shell.overlay registration')
  if (calls.overlays.length !== 1) problems.push(`registered ${calls.overlays.length} overlay cards, expected 1`)
  if (calls.disposers.length === 0) problems.push('no owned effects were registered')

  // Which palette the picker put in force for this scheme.
  const applied = calls.themeSet.filter((id) => id.startsWith('omarchy-'))
  const wanted = host.expectApplied === undefined ? null : host.expectApplied
  if (wanted === null) {
    if (applied.length > 0) problems.push(`applied ${applied.join(', ')} where none was expected`)
  } else if (!applied.includes(wanted)) {
    problems.push(`applied ${applied.length === 0 ? 'nothing' : applied.join(', ')}; expected ${wanted}`)
  }

  const rendered = renderAll(calls, problems)

  // Teardown: every disposer the features handed over must run clean, because a
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

/** Render every registered component, children and all. */
function renderAll(calls, problems) {
  const rendered = []
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
  return rendered
}

/* ── run every host, then judge ────────────────────────────────────────── */

const failures = []
for (const host of HOSTS) {
  const result = await runHost(host)
  if (result.problems.length > 0) failures.push({ host: host.label, problems: result.problems })
  else {
    console.log(`omaseek: ${host.label} ok — ${result.calls.themeRegistrations.length} themes, `
      + `${result.calls.registered.length} registrations, ${result.rendered.length} components rendered, `
      + `${result.torn} disposers run`)
  }
}

if (failures.length > 0) {
  console.error('omaseek: browser half smoke test failed')
  for (const failure of failures) {
    console.error(`  ${failure.host}:`)
    for (const problem of failure.problems) console.error(`    - ${problem}`)
  }
  process.exit(1)
}
