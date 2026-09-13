/**
 * OmaSeek — Omarchy home-page themes for DeepSeek Harness. Node half.
 *
 * Reads the palette research doc (`themes.md`) and serves the 22 home-page
 * themes to this package's browser half over one Connection Fetch route. The
 * doc is the single source of truth: editing a hex value there and reloading
 * the page is all it takes to change a palette, so no color list is
 * duplicated into plugin code.
 *
 * The doc ships with the package, so it is read through a URL relative to
 * this module rather than a checkout path — wherever pnpm installs OmaSeek,
 * the module finds its own `themes.md`. The `fs` Service stays optional: we
 * use it when the host carries one and fall back to the Node builtin read
 * when it does not.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

/** The research doc, located beside the package rather than at a fixed path. */
const DOC_URL = new URL('../../themes.md', import.meta.url)

/** The same location as a host path, for the `fs` Service and the payload. */
const DOC_PATH = fileURLToPath(DOC_URL)

/** Palette slots served per theme, in the order the browser half decodes them. */
var KEYS = [
  'bg', 'bgDeep', 'surface', 'surface2', 'borderSubtle', 'borderStrong',
  'brand', 'text', 'textSecondary', 'textMuted', 'brandInk', 'fieldBg', 'error', 'success', 'warn',
]

/** §7.2 row label → palette slot. The sidebar fill follows --t-bg-deep. */
var NATIVE_ROWS = [
  ['--dsw-alias-bg-base', 'bg'],
  ['--dsw-alias-bg-layer-1', 'bgDeep'],
  ['--dsw-alias-bg-layer-2', 'surface2'],
  ['--dsw-alias-bg-overlay', 'surface'],
  ['--dsw-alias-border-l1', 'borderSubtle'],
  ['--dsw-alias-border-l2', 'borderStrong'],
  ['--dsw-alias-brand-primary', 'brand'],
  ['--dsw-alias-label-primary', 'text'],
  ['--dsw-alias-label-secondary', 'textSecondary'],
  ['--dsw-alias-state-error-primary', 'error'],
  ['--dsw-alias-state-success-primary', 'success'],
  ['--dsw-alias-state-warn-primary', 'warn'],
]

/** Split a markdown table row into trimmed cells (outer pipes dropped). */
function cells(line) {
  return line.split('|').slice(1, -1).map(function (cell) { return cell.trim() })
}

/** Strip backticks and trailing inline notes from a color cell. */
function color(cell) {
  return String(cell || '').replace(/`/g, '').split('(')[0].trim()
}

/**
 * Read one markdown table from the doc.
 * @param lines - doc lines.
 * @param heading - exact heading the table sits under.
 * @param labelCols - how many leading columns are labels (not themes).
 * @param match - keeps the rows whose first cell matches this substring.
 * @returns rows keyed by their first cell, values keyed by theme display name.
 */
function table(lines, heading, labelCols, match) {
  var start = -1
  for (var i = 0; i < lines.length; i += 1) {
    if (lines[i].indexOf(heading) === 0) { start = i; break }
  }
  if (start < 0) throw new Error('heading not found: ' + heading)
  var header = -1
  for (var j = start; j < lines.length; j += 1) {
    if (lines[j].charAt(0) === '|' && lines[j].indexOf('Tokyo Night') >= 0) { header = j; break }
  }
  if (header < 0) throw new Error('no theme header after: ' + heading)
  var names = cells(lines[header]).slice(labelCols)
  var rows = {}
  for (var k = header + 1; k < lines.length; k += 1) {
    // The table ends at the first non-table line: never walk into a sibling.
    if (lines[k].charAt(0) !== '|') break
    var row = cells(lines[k])
    if (row.length < names.length + labelCols) continue
    if (row[0].indexOf(match) < 0) continue
    var values = {}
    for (var n = 0; n < names.length; n += 1) values[names[n]] = color(row[labelCols + n])
    rows[row[0].replace(/`/g, '').split('\u2190')[0].trim()] = values
  }
  return rows
}

/** First row of `rows` whose key contains `needle`. */
function pick(rows, needle) {
  for (var key in rows) {
    if (key.indexOf(needle) >= 0) return rows[key]
  }
  throw new Error('no row matching "' + needle + '"')
}

/**
 * Parse the 22 home-page themes out of the research doc.
 * @param text - full themes.md content.
 * @returns `[{ id, name, scheme, palette }]` in the picker order of §2.
 */
function parseThemes(text) {
  var lines = text.split('\n')
  var entries = []
  for (var i = 0; i < lines.length; i += 1) {
    var m = lines[i].match(/^\|\s*(\d+)\s*\|\s*`([a-z0-9-]+)`\s*\|\s*([^|]+?)\s*\|\s*`(light|dark)`\s*\|/)
    if (m === null) continue
    entries.push({ order: Number(m[1]), id: m[2], name: m[3], scheme: m[4] })
  }
  if (entries.length !== 22) throw new Error('expected 22 themes in \u00a72, found ' + entries.length)
  entries.sort(function (a, b) { return a.order - b.order })

  var native = table(lines, '### 7.2', 1, '--dsw-')
  var ui = table(lines, '### 4.1', 2, '')
  var fields = table(lines, '### 5.2', 1, 'Text input field')

  return entries.map(function (entry) {
    var palette = {}
    for (var t = 0; t < NATIVE_ROWS.length; t += 1) {
      var name = NATIVE_ROWS[t][0]
      var row = Object.prototype.hasOwnProperty.call(native, name) ? native[name] : undefined
      if (row === undefined) throw new Error('\u00a77.2 row missing: ' + name)
      palette[NATIVE_ROWS[t][1]] = row[entry.name]
    }
    palette.textMuted = pick(ui, 'Muted text')[entry.name]
    palette.brandInk = pick(ui, 'On-brand text')[entry.name]
    palette.fieldBg = pick(fields, 'Text input field')[entry.name]
    for (var k = 0; k < KEYS.length; k += 1) {
      var value = palette[KEYS[k]]
      if (typeof value !== 'string' || value.length === 0) {
        throw new Error('empty palette value for ' + entry.id + '/' + KEYS[k])
      }
    }
    return { id: entry.id, name: entry.name, scheme: entry.scheme, palette: palette }
  })
}

/**
 * Read the doc through whichever seam this host offers. We ask for the `fs`
 * Service first because a host that mounts one may serve the doc from a
 * sandbox the Node builtin cannot see; its failure is not fatal, since the
 * builtin can always read the file sitting next to this module.
 */
async function readDoc(ctx) {
  const fileSystem = ctx.get('fs')
  if (fileSystem !== undefined) {
    try {
      const target = await fileSystem.resolve(DOC_PATH)
      return await fileSystem.readText(target)
    } catch (error) {
      // A service scoped to a workspace may refuse the package directory;
      // fall through rather than fail the request.
    }
  }
  return await readFile(DOC_URL, 'utf8')
}

/**
 * Register this package's theme route on the browser connection.
 *
 * The registration hangs off `ctx.inject` rather than a guard: this apply runs
 * while the composition is still assembling, so `ctx.get('connection')` at that
 * moment reads an empty registry and the route would never appear at all. The
 * injected scope attaches the route when a connection exists, re-runs if it is
 * replaced, and disposes with the fiber. A host with no browser half — headless,
 * TUI — never runs the callback, which is exactly the silent load it wants.
 */
export function registerThemeRoutes(host) {
  host.inject(['connection'], function (ctx) {
    ctx.effect(function () {
      return ctx.connection.fetch.register({
        path: '/api/omaseek.themes',
        methods: ['GET'],
        requestBody: 'buffered',
        // Parsed on every request: the doc is the source of truth, so editing
        // themes.md and reloading the page is all it takes.
        fetch: async function () {
          const text = await readDoc(ctx)
          return Response.json({ path: DOC_PATH, themes: parseThemes(text) })
        },
      })
    }, 'omaseek: theme route')
  })
}
