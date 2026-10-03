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
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
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

  // The themes route, asked for real. It carries the 22 ports *and* the list of
  // themes installed on the machine, so it is checked against fixtures under a
  // temporary HOME rather than against whatever the machine running this happens
  // to have installed: a developer's own theme collection must not decide
  // whether the suite passes, and a machine with none must still be checked.
  const themesRoute = routes.find((row) => row.path.endsWith('.themes'))
  if (themesRoute !== undefined) {
    const sandbox = join(tmpdir(), 'omaseek-check-hosts-' + process.pid)
    const home = join(sandbox, 'home')
    const omarchy = join(sandbox, 'omarchy')
    const userThemes = join(home, '.config', 'omarchy', 'themes')
    const saved = { HOME: process.env.HOME, OMARCHY_PATH: process.env.OMARCHY_PATH }
    try {
      const theme = async (root, slug, files) => {
        await mkdir(join(root, slug), { recursive: true })
        for (const [name, body] of Object.entries(files)) {
          await writeFile(join(root, slug, name), body)
        }
      }
      await theme(userThemes, 'modern', {
        'colors.toml': 'mode = "dark"\nbackground = "#101010"\ndark_background = "#0a0a0a"\n'
          + 'lighter_background = "#202020"\nforeground = "#e0e0e0"\naccent = "#ff8800"\n',
      })
      await theme(userThemes, 'legacy', {
        'alacritty.toml': "[colors.primary]\nbackground = '#1a0d2e'\nforeground = '#d4a5ff'\n"
          + "[colors.normal]\nblue = '#8b9aff'\nred = '#ff6ec7'\n"
          + "[colors.bright]\nblue = '#b8c1ff'\n",
      })
      // A palette file with nothing quoted in it, and a directory with no
      // palette at all: both are themes that cannot be painted.
      await theme(userThemes, 'broken', { 'colors.toml': 'background = 12\n[table]\nx = { y = 1 }\n' })
      await theme(userThemes, 'empty', { 'README.md': '# nothing\n' })
      // Omarchy's own directory: one slug this package already ports, and one it
      // has never heard of.
      await theme(join(omarchy, 'themes'), 'catppuccin', { 'colors.toml': 'background = "#1e1e2e"\n' })
      await theme(join(omarchy, 'themes'), 'nova', { 'colors.toml': 'background = "#001122"\nforeground = "#eeeeee"\n' })

      process.env.HOME = home
      process.env.OMARCHY_PATH = omarchy
      const response = await themesRoute.fetch({ url: 'http://check/api/omaseek.themes' })
      const body = await response.json()
      const slugs = ((body.installed || {}).themes || []).map((one) => one.slug)
      const names = ((body.installed || {}).themes || []).map((one) => one.name)
      const bySlug = Object.fromEntries(((body.installed || {}).themes || []).map((one) => [one.slug, one]))

      if (response.status !== 200) problems.push(`${manifest.name}: ${themesRoute.path} answered ${response.status}`)
      else if (!Array.isArray(body.themes) || body.themes.length === 0) problems.push(`${manifest.name}: ${themesRoute.path} served no ports`)
      else if (slugs.join(',') !== 'legacy,modern,nova') {
        problems.push(`${manifest.name}: installed themes were ${JSON.stringify(slugs)},`
          + ' expected legacy,modern,nova (broken and empty skipped, the ported catppuccin left to its own card)')
      } else if (names.join(',') !== 'Legacy,Modern,Nova') {
        problems.push(`${manifest.name}: installed theme names were ${JSON.stringify(names)}`)
      } else if ((body.installed || {}).skipped !== 2) {
        problems.push(`${manifest.name}: ${themesRoute.path} reported ${(body.installed || {}).skipped} unreadable, expected 2`)
      } else if (bySlug.legacy.colors.color4 !== '#8b9aff' || bySlug.legacy.colors.background !== '#1a0d2e') {
        problems.push(`${manifest.name}: a legacy theme's alacritty palette was not read back: `
          + JSON.stringify(bySlug.legacy.colors))
      } else if (bySlug.modern.colors.lighter_background !== '#202020') {
        problems.push(`${manifest.name}: an installed theme's colors.toml was not served whole`)
      } else {
        console.log(`omaseek: ${manifest.name} — ${main} exports apply(), ${routes.length} route(s), `
          + `${body.themes.length} ports and ${slugs.length} installed themes served`)
        continue
      }
    } catch (error) {
      problems.push(`${manifest.name}: ${themesRoute.path} threw — ${error.message}`)
    } finally {
      if (saved.HOME === undefined) delete process.env.HOME
      else process.env.HOME = saved.HOME
      if (saved.OMARCHY_PATH === undefined) delete process.env.OMARCHY_PATH
      else process.env.OMARCHY_PATH = saved.OMARCHY_PATH
      await rm(sandbox, { recursive: true, force: true })
    }
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
