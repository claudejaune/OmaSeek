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
  console.log(`omaseek: ${manifest.name} — ${main} exports apply(), bundle present`)
}

if (problems.length > 0) {
  console.error('omaseek: Node half check failed')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}
