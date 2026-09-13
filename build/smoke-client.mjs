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
 * It is not a browser, and the stub React is not React: hooks have no order,
 * no re-render and no dependency comparison, so a hook-rule violation or an
 * update-path bug passes here. What it does cover is module-graph binding,
 * apply surviving the services it asks for, first-render crashes, and teardown
 * that throws.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

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
}
let loaded = null

globalThis.window = windowStub
globalThis.document = documentStub
globalThis.getComputedStyle = windowStub.getComputedStyle
globalThis.matchMedia = windowStub.matchMedia
globalThis.requestAnimationFrame = windowStub.requestAnimationFrame
globalThis.cancelAnimationFrame = windowStub.cancelAnimationFrame
globalThis.addEventListener = windowStub.addEventListener
globalThis.removeEventListener = windowStub.removeEventListener

/* ── the services ──────────────────────────────────────────────────────── */

const calls = { registered: [], sections: [], overlays: [], themeRegistrations: [], disposers: [] }

const themeService = {
  register(definition) {
    calls.themeRegistrations.push(definition)
    return () => {}
  },
  getTheme() { return { active: { id: 'dark', colorScheme: 'dark' }, preference: 'system' } },
  setTheme() {},
}

// The real registry runs a contribution's callback only once its slot is
// declared, and throws when `register` is called outside that callback. The
// stub keeps that contract so an undeclared-slot registration is a failure here
// rather than a silent no-op in the page.
const declaredSlots = new Set()
let injecting = null
const slotsService = {
  inject(name, callback) {
    declaredSlots.add(name)
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

function makeCtx() {
  return {
    get(name) { return services[name] },
    // The features attach through ctx.inject; the stub runs the callback the
    // way cordis does once its dependencies exist.
    inject(dependencies, callback) {
      const missing = dependencies.filter((name) => services[name] === undefined)
      if (missing.length > 0) throw new Error(`ctx.inject waited for missing services: ${missing.join(', ')}`)
      callback(this)
      return undefined
    },
    effect(fn) {
      const off = fn()
      if (typeof off === 'function') calls.disposers.push(off)
    },
    on() { return () => {} },
  }
}

/* ── the fetch bridge ──────────────────────────────────────────────────── */

const PALETTE_KEYS = ['bg', 'bgDeep', 'surface', 'surface2', 'borderSubtle', 'borderStrong',
  'brand', 'text', 'textSecondary', 'textMuted', 'brandInk', 'fieldBg', 'error', 'success', 'warn']

function palette() {
  const out = {}
  for (const key of PALETTE_KEYS) out[key] = '#123456'
  return out
}

const THEMES = {
  path: '/tmp/themes.md',
  themes: [
    { id: 'tokyo-night', name: 'Tokyo Night', scheme: 'dark', palette: palette() },
    { id: 'white', name: 'White', scheme: 'light', palette: palette() },
  ],
}

const TIMELINE = { duration: 210, fps: 30, bands: 48, spectrum: Buffer.from([1, 2, 3]).toString('base64') }

globalThis.fetch = async (path) => {
  if (path === '/api/omaseek.themes') return jsonResponse(THEMES)
  if (path === '/api/omaseek.music.meta') {
    return jsonResponse({ title: 'T', artist: 'A', size: 0, art: '', timeline: TIMELINE, icons: null })
  }
  return { ok: false, status: 404, async json() { return {} } }
}

function jsonResponse(value) {
  return { ok: true, status: 200, async json() { return value } }
}

/* ── run it ────────────────────────────────────────────────────────────── */

const source = await readFile(resolve(ROOT, 'lib/client.js'), 'utf8')
new Function('window', source)(windowStub)

if (loaded === null) throw new Error('omaseek: bundle never called window.__ModuleLoader__.load')
if (loaded.id !== 'omaseek') throw new Error(`omaseek: bundle registered as "${loaded.id}"`)

const externals = { react: React }
const moduleExports = loaded.factory((id) => {
  if (id in externals) return externals[id]
  throw new Error(`omaseek: bundle asked the page for "${id}", which is not a client baseline module`)
})

if (typeof moduleExports.apply !== 'function') throw new Error('omaseek: bundle exports no apply()')

const problems = []
try {
  moduleExports.apply(makeCtx())
} catch (error) {
  // A body that never bound a name fails here, which is the whole point of the
  // test — report it with the module graph rather than as a bare stack.
  console.error('omaseek: browser half smoke test failed')
  console.error(`  - apply() threw: ${error.message}`)
  process.exit(1)
}

// The theme table arrives over the fetch bridge, so the registrations land a
// microtask later — wait for them instead of racing the assertions below.
await new Promise((done) => setTimeout(done, 20))

/* ── what must have happened ───────────────────────────────────────────── */

if (calls.themeRegistrations.length !== THEMES.themes.length) {
  problems.push(`registered ${calls.themeRegistrations.length} themes, expected ${THEMES.themes.length}`)
}
if (!calls.sections.includes('settings.section')) problems.push('no settings.section registration')
if (calls.overlays.length !== 1) problems.push(`registered ${calls.overlays.length} overlay cards, expected 1`)
if (calls.disposers.length === 0) problems.push('no owned effects were registered')

// Render whatever the features registered, children and all: a component that
// throws here would throw in the page on the same first render.
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

if (problems.length > 0) {
  console.error('omaseek: browser half smoke test failed')
  for (const problem of problems) console.error('  - ' + problem)
  process.exit(1)
}
console.log(`omaseek: browser half ok — ${calls.themeRegistrations.length} themes, `
  + `${calls.registered.length} slot registrations, ${rendered.length} components rendered, `
  + `${torn} disposers run`)
