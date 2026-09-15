#!/usr/bin/env node
/**
 * Load each package's Node half the way the harness does.
 *
 * A row mounts the module its `main` points at, and cordis rejects anything
 * that is not a function or an object with `apply` — which is exactly what a
 * plugin that exports a named helper instead of `apply` looks like at boot:
 * "invalid plugin, expect function or object with an \"apply\" method, received
 * object". Importing each one here turns that into a build failure instead.
 *
 * The browser halves have their own suite (`smoke-client.mjs`); this is the
 * Node side, where a mistake costs a whole profile's boot.
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'

const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)))

const packages = [
  'packages/omaseek-themes',
  'packages/omaseek-pixel',
  'packages/omaseek-music',
]

const problems = []
for (const dir of packages) {
  const manifest = JSON.parse(await readFile(resolve(REPO, dir, 'package.json'), 'utf8'))
  const main = manifest.main === undefined ? 'index.js' : manifest.main
  const entry = resolve(REPO, dir, main)
  if (!existsSync(entry)) {
    problems.push(`${manifest.name}: main points at ${main}, which does not exist`)
    continue
  }
  let plugin
  try {
    plugin = await import(pathToFileURL(entry).href)
  } catch (error) {
    problems.push(`${manifest.name}: importing ${main} threw — ${error.message}`)
    continue
  }
  if (typeof plugin.apply !== 'function') {
    problems.push(`${manifest.name}: ${main} exports no apply() — a row mounting it would fail to boot`)
    continue
  }
  if (plugin.name !== undefined && plugin.name !== manifest.name) {
    problems.push(`${manifest.name}: exported name is "${plugin.name}"`)
    continue
  }
  if (!existsSync(resolve(REPO, dir, 'lib/client.js'))) {
    problems.push(`${manifest.name}: lib/client.js is missing — run \`pnpm build\``)
    continue
  }

  /**
   * Mount the half the way cordis does and see what it registers.
   *
   * A host half that imports cleanly can still be broken: the browser-half
   * suite never runs it, so a route that throws in its own body — or a name
   * that no longer exists anywhere — passes every check there is and fails on
   * the first real request. That is exactly what happened with the music
   * plugin's station route, which answered 500 for days with twenty-one green
   * cases behind it.
   */
  const routes = []
  const ctx = {
    get: () => undefined,
    effect(callback) { return callback() },
    connection: { fetch: { register(row) { routes.push(row); return () => {} } } },
    inject(_names, callback) { callback(ctx) },
  }
  try {
    plugin.apply(ctx)
  } catch (error) {
    problems.push(`${manifest.name}: apply() threw — ${error.message}`)
    continue
  }
  // A half with no Node-side need registers nothing, which is its right: the
  // hero was never going to talk to the machine. What is checked is every route
  // it DID register.
  if (routes.length === 0) {
    console.log(`omaseek: ${manifest.name} — ${main} exports apply(), no routes (fine)`)
    continue
  }

  // The one route that talks to the outside world: ask it for real, so a route
  // that is registered but throws on its own first line fails here rather than
  // in front of whoever installed the plugin.
  const station = routes.find((row) => row.path.endsWith('.music.tracks'))
  if (station !== undefined) {
    try {
      const response = await station.fetch({ url: 'http://check/api/omaseek.music.tracks' })
      const body = await response.json()
      if (response.status !== 200) {
        problems.push(`${manifest.name}: ${station.path} answered ${response.status} — ${body.error || ''}`)
        continue
      }
      if (!Array.isArray(body.tracks) || body.tracks.length === 0) {
        problems.push(`${manifest.name}: ${station.path} listed no tracks`)
        continue
      }
      console.log(`omaseek: ${manifest.name} — ${main} exports apply(), ${routes.length} route(s), `
        + `${body.tracks.length} tracks served`)
      continue
    } catch (error) {
      problems.push(`${manifest.name}: ${station.path} threw — ${error.message}`)
      continue
    }
  }

  console.log(`omaseek: ${manifest.name} — ${main} exports apply(), ${routes.length} route(s)`)
}

if (problems.length > 0) {
  console.error('omaseek: Node half check failed')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}
