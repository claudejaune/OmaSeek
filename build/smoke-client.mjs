#!/usr/bin/env node
/**
 * Execute the built browser half the way the page will, under stubs.
 *
 * `node --check` only proves the bundle parses, and the server-side checks
 * only prove it is *served*. Neither runs a module body, so neither can see a
 * name that was never bound — an import rewritten into a nested block, say.
 * This evaluates the bundle, hands `apply` a fake Cordis context whose services
 * and slots answer, and fails loudly on any throw. It runs on every `pnpm check`.
 *
 * It is not a browser: it proves the module graph binds and that apply survives
 * the services it asks for, not that the pixels look right.
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

/** Enough React for module init and one render pass; no reconciler. */
const React = {
  createElement(type, props, ...children) {
    return { type, props: props === null || props === undefined ? {} : props, children }
  },
  useState(initial) {
    let value = typeof initial === 'function' ? initial() : initial
    return [value, (next) => { value = typeof next === 'function' ? next(value) : next }]
  },
  useEffect(callback) { const off = callback(); return typeof off === 'function' ? off : undefined },
  useRef(initial) { return { current: initial === undefined ? null : initial } },
  useMemo(factory) { return factory() },
  useCallback(fn) { return fn },
}

globalThis.window = globalThis
globalThis.document = documentStub
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '', color: 'rgb(0, 0, 0)' })
globalThis.matchMedia = () => ({ matches: false })
globalThis.requestAnimationFrame = () => 0
globalThis.cancelAnimationFrame = () => {}
globalThis.addEventListener = () => {}
globalThis.removeEventListener = () => {}

/* ── the services ──────────────────────────────────────────────────────── */

const calls = { registered: [], sections: [], overlays: [], themeRegistrations: [], themeSet: [] }

const themeService = {
  register(definition) { calls.themeRegistrations.push(definition); return () => {} },
  getTheme() { return { active: { id: 'dark', colorScheme: 'dark' }, preference: 'system' } },
  setTheme(id) { calls.themeSet.push(id) },
}

const slotsService = {
  inject(name, callback) { calls.sections.push(name); const off = callback(); return typeof off === 'function' ? off : () => {} },
  register(options, component) {
    calls.registered.push({ options, component })
    if (options !== undefined && options.name === 'shell.overlay') calls.overlays.push(options)
    return () => {}
  },
}

const services = { theme: themeService, slots: slotsService }

function makeCtx() {
  return {
    get(name) { return services[name] },
    // The features attach through ctx.inject; the stub runs the callback the
    // way cordis does once its dependencies exist.
    inject(deps, callback) { callback(this); return undefined },
    effect(fn) { const off = fn(); if (typeof off === 'function') calls.effects = (calls.effects || 0) + 1 },
    on() { return () => {} },
  }
}

/* ── the fetch bridge ──────────────────────────────────────────────────── */

const THEMES = {
  path: '/tmp/themes.md',
  themes: [
    { id: 'tokyo-night', name: 'Tokyo Night', scheme: 'dark', palette: palette() },
    { id: 'white', name: 'White', scheme: 'light', palette: palette() },
  ],
}

function palette() {
  const out = {}
  for (const key of ['bg', 'bgDeep', 'surface', 'surface2', 'borderSubtle', 'borderStrong',
    'brand', 'text', 'textSecondary', 'textMuted', 'brandInk', 'fieldBg', 'error', 'success', 'warn']) {
    out[key] = '#123456'
  }
  return out
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
let entry = null
// The loader facade the shell leaves in the page, trailing underscores and all.
const windowLike = { __ModuleLoader__: { load(definition) { entry = definition } } }
new Function('window', source)(windowLike)

if (entry === null) throw new Error('omaseek: bundle never called window.__ModuleLoader__.load')
if (entry.id !== 'omaseek') throw new Error(`omaseek: bundle registered as "${entry.id}"`)

const externals = { react: React }
const moduleExports = entry.factory((id) => {
  if (id in externals) return externals[id]
  throw new Error(`omaseek: bundle asked the page for "${id}", which is not a client baseline module`)
})

if (typeof moduleExports.apply !== 'function') throw new Error('omaseek: bundle exports no apply()')

moduleExports.apply(makeCtx())

// The theme table arrives over the fetch bridge, so the registrations land a
// microtask later — wait for them instead of racing the assertions below.
await new Promise((done) => setTimeout(done, 20))

/* ── what must have happened ───────────────────────────────────────────── */

const problems = []
if (calls.themeRegistrations.length !== THEMES.themes.length) {
  problems.push(`registered ${calls.themeRegistrations.length} themes, expected ${THEMES.themes.length}`)
}
if (!calls.sections.includes('settings.section')) problems.push('no settings.section registration')
if (calls.overlays.length !== 1) problems.push(`registered ${calls.overlays.length} overlay cards, expected 1`)
if ((calls.effects || 0) === 0) problems.push('no owned effects were registered')

// Render whatever the features registered: a component that throws here would
// throw in the page on the same first render.
for (const { options, component } of calls.registered) {
  if (typeof component !== 'function') continue
  try {
    component({})
  } catch (error) {
    problems.push(`${options.name} "${options.id || options.key}" threw on render: ${error.message}`)
  }
}

if (problems.length > 0) {
  console.error('omaseek: browser half smoke test failed')
  for (const problem of problems) console.error('  - ' + problem)
  process.exit(1)
}
console.log(`omaseek: browser half ok — ${calls.themeRegistrations.length} themes, `
  + `${calls.registered.length} slot registrations, ${calls.effects} effects`)
