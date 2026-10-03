/**
 * OmaThemes — Omarchy home-page themes for DeepSeek Harness. Node half.
 *
 * Reads the palette research doc (`themes.md`) and serves the 22 home-page
 * themes to this package's browser half over one Connection Fetch route. The
 * doc is the single source of truth: editing a hex value there and reloading
 * the page is all it takes to change a palette, so no color list is
 * duplicated into plugin code.
 *
 * The doc ships with the package, so it is read through a URL relative to
 * this module rather than a checkout path — wherever pnpm installs OmaThemes,
 * the module finds its own `themes.md`. The `fs` Service stays optional: we
 * use it when the host carries one and fall back to the Node builtin read
 * when it does not.
 *
 * The same route also lists the themes *installed* on this machine, so a reader
 * on Omarchy sees their own themes as cards beside the 22. That list is a
 * filesystem question — `~/.config/omarchy/themes`, plus Omarchy's own theme
 * directory for anything it ships beyond the 22 — which is why it lives on this
 * side of the seam: a page cannot read a directory. Nothing is written, no
 * theme file is executed, and a machine without those directories simply
 * reports none.
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fileSize, listDirectory, readText } from './files.js'

/** The research doc, located beside the package rather than at a fixed path. */
const DOC_URL = new URL('../themes.md', import.meta.url)

/** The same location as a host path, for the `fs` Service and the payload. */
const DOC_PATH = fileURLToPath(DOC_URL)

/** Where Omarchy keeps the themes its reader installed. */
const USER_THEMES = ['.config', 'omarchy', 'themes']

/** Where Omarchy's own package keeps its themes, when `OMARCHY_PATH` is unset. */
const SYSTEM_THEMES = '/usr/share/omarchy/themes'

/** A theme's largest palette we will read, matching the extension's own cap. */
const MAX_PALETTE_BYTES = 65536

/** How many installed themes one response will carry. */
const MAX_INSTALLED = 200

/** The eight ANSI names, in slot order. */
const ANSI = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']


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
  // The doc is the source of truth, so a 23rd theme belongs in the picker the
  // moment it is written down; the count is not the contract, the tables are.
  if (entries.length === 0) throw new Error('no themes found in \u00a72 of the research doc')
  entries.sort(function (a, b) { return a.order - b.order })

  var native = table(lines, '### 7.2', 1, '--dsw-')
  var ui = table(lines, '### 4.1', 2, '')
  var fields = table(lines, '### 5.2', 1, 'Text input field')

  // One theme whose column drifted is one theme short, not an empty picker:
  // the rest are served and the casualties are reported.
  var themes = []
  var skipped = []
  for (var e = 0; e < entries.length; e += 1) {
    var entry = entries[e]
    try {
      themes.push(buildTheme(entry, native, ui, fields))
    } catch (error) {
      skipped.push(entry.id + ' (' + String((error && error.message) || error) + ')')
    }
  }
  if (themes.length === 0) {
    throw new Error('no theme could be read from the research doc — ' + skipped.join('; '))
  }
  if (skipped.length > 0) {
    console.warn('omaseek: ' + skipped.length + ' theme(s) skipped — ' + skipped.join('; '))
  }
  return themes
}

/** One §2 entry joined against the §7.2 / §4.1 / §5.2 tables. */
function buildTheme(entry, native, ui, fields) {
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
}

/** Read the research doc through whichever seam this host offers. */
async function readDoc(ctx) {
  return await readText(ctx, DOC_PATH)
}

/**
 * The `key = value` lines of a theme file, with a section folded into its keys.
 *
 * `colors.toml` is a flat table of double-quoted colours; an `alacritty.toml` is
 * sectioned and single-quoted. Both shapes are all this reads, and only quoted
 * strings at that: every value that matters is a colour, and a palette file is
 * not a program. Anything else — a bare number, a nested table, a line that is
 * not a pair — is skipped rather than guessed at.
 */
function pairs(text) {
  const values = {}
  let section = ''
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.charAt(0) === '#') continue
    const header = trimmed.match(/^\[([^\]]+)\]$/)
    if (header !== null) {
      section = header[1].trim()
      continue
    }
    const pair = trimmed.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/)
    if (pair === null) continue
    const quoted = pair[2].trim().match(/^"([^"]*)"|^'([^']*)'/)
    if (quoted === null) continue
    const value = quoted[1] === undefined ? quoted[2] : quoted[1]
    values[section === '' ? pair[1] : section + '.' + pair[1]] = value.trim()
  }
  return values
}

/**
 * The palette a legacy theme would be given.
 *
 * `omarchy-theme-set` generates a `colors.toml` from an `alacritty.toml` when a
 * theme ships none, and this is that generation read back: the ANSI sixteen with
 * bright falling back to normal, then the accent and the selection, then the two
 * anchors everything else is stepped from. Nearly half the community themes are
 * this shape, so leaving them out would hide exactly the themes a reader
 * installed for themselves.
 */
function fromAlacritty(text) {
  const values = pairs(text)
  const colors = {}
  for (let i = 0; i < ANSI.length; i += 1) {
    const normal = values['colors.normal.' + ANSI[i]]
    const bright = values['colors.bright.' + ANSI[i]] || normal
    if (normal !== undefined) colors['color' + i] = normal
    if (bright !== undefined) colors['color' + (i + 8)] = bright
  }
  const background = values['colors.primary.background'] || colors.color0
  const foreground = values['colors.primary.foreground'] || colors.color7
  if (background !== undefined) {
    colors.background = background
    colors.color0 = background
  }
  if (foreground !== undefined) {
    colors.foreground = foreground
    colors.color7 = foreground
  }
  if (colors.color4 !== undefined) colors.accent = colors.color4
  const selection = values['colors.selection.background'] || foreground
  if (selection !== undefined) colors.selection = selection
  return colors
}

/** One palette file read, or null when it is absent, oversized or unreadable. */
async function readPalette(ctx, path, legacy) {
  const size = await fileSize(ctx, path)
  if (size === 0 || size > MAX_PALETTE_BYTES) return null
  const text = await readText(ctx, path)
  return legacy ? fromAlacritty(text) : pairs(text)
}

/** The theme names `omarchy theme list` prints, out of the slugs it lists. */
function prettyName(slug) {
  return slug
    .replace(/(^|-)([a-z])/g, function (match, lead, letter) { return lead + letter.toUpperCase() })
    .replace(/-/g, ' ')
}

/**
 * The themes installed under one root.
 * @param ctx - host context.
 * @param root - the directory holding theme directories.
 * @param ported - slugs this package already ships a port of.
 * @param seen - slugs another root has already answered for.
 * @param skipPorted - whether a ported slug is left to its own card (true for
 *   Omarchy's own directory, whose 22 are the 22 ports; false for the reader's,
 *   where a directory with a ported name is their own edited copy and gets a
 *   card of its own).
 * @returns `{ found, skipped }`.
 */
async function installedIn(ctx, root, ported, seen, skipPorted) {
  const found = []
  let skipped = 0
  let children
  try {
    children = await listDirectory(ctx, root)
  } catch (error) {
    // A root this package may not read is logged and skipped: the 22 ports are
    // this route's promise and must not fail with the list beside them.
    console.warn('omaseek: listing ' + root + ' failed — ' + String((error && error.message) || error))
    return { found: found, skipped: skipped }
  }

  for (const child of children.slice(0, MAX_INSTALLED)) {
    if (child.type !== 'directory' && child.type !== 'symlink') continue
    const slug = child.name
    if (slug === '' || slug.charAt(0) === '.') continue
    // One card per name, the reader's own copy winning, which is how Omarchy
    // resolves a theme name too.
    if (seen.has(slug)) continue
    seen.add(slug)
    if (skipPorted && ported.has(slug)) continue

    let colors = null
    try {
      colors = await readPalette(ctx, join(root, slug, 'colors.toml'), false)
      if (colors === null) colors = await readPalette(ctx, join(root, slug, 'alacritty.toml'), true)
    } catch (error) {
      colors = null
    }
    if (colors === null || Object.keys(colors).length === 0) {
      skipped += 1
      continue
    }
    found.push({ slug: slug, name: prettyName(slug), colors: colors })
  }

  return { found: found, skipped: skipped }
}

/**
 * Every theme installed on this machine, and how many could not be read.
 *
 * Two roots, in the order Omarchy's own lister walks them: the reader's themes,
 * then Omarchy's own for anything it ships beyond the 22 ports — a newer Omarchy
 * with a 23rd stock theme gets a card without this package changing. A machine
 * that is not Omarchy has neither directory, which is the whole platform gate:
 * nothing here asks what OS it is running on.
 * @param ctx - host context.
 * @param ported - slugs this package already ships a port of.
 * @returns `{ themes, skipped }`, themes capped.
 */
async function readInstalled(ctx, ported) {
  const seen = new Set()
  const themes = []
  let skipped = 0
  const roots = [
    { path: join(homedir(), ...USER_THEMES), skipPorted: false },
    { path: process.env.OMARCHY_PATH ? join(process.env.OMARCHY_PATH, 'themes') : SYSTEM_THEMES, skipPorted: true },
  ]

  for (const root of roots) {
    const read = await installedIn(ctx, root.path, ported, seen, root.skipPorted)
    for (const theme of read.found) themes.push(theme)
    skipped += read.skipped
  }

  return { themes: themes.slice(0, MAX_INSTALLED), skipped: skipped }
}

/**
 * The plugin's entry point: register this package's theme route on the browser
 * connection.
 *
 * The registration hangs off `ctx.inject` rather than a guard: this apply runs
 * while the composition is still assembling, so `ctx.get('connection')` at that
 * moment reads an empty registry and the route would never appear at all. The
 * injected scope attaches the route when a connection exists, re-runs if it is
 * replaced, and disposes with the fiber. A host with no browser half — headless,
 * TUI — never runs the callback, which is exactly the silent load it wants.
 */
export function apply(host) {
  host.inject(['connection'], function (ctx) {
    ctx.effect(function () {
      return ctx.connection.fetch.register({
        path: '/api/omaseek.themes',
        methods: ['GET'],
        requestBody: 'buffered',
        // Parsed on every request: the doc is the source of truth, so editing
        // themes.md and reloading the page is all it takes. A failure here is
        // answered, not thrown: an uncaught throw leaves the route as an empty
        // 400 from the carrier, which reads as a bad request rather than a
        // broken research doc.
        fetch: async function () {
          try {
            const text = await readDoc(ctx)
            const themes = parseThemes(text)
            let installed = { themes: [], skipped: 0 }
            try {
              installed = await readInstalled(ctx, new Set(themes.map(function (one) { return one.id })))
            } catch (error) {
              // The installed list is what a reader added; the 22 ports are what
              // this package promised. A failure to list is answered with none
              // rather than with nothing at all.
              console.warn('omaseek: reading installed themes failed — ' + String((error && error.message) || error))
            }
            return Response.json({ themes: themes, installed: installed },
              { headers: { 'cache-control': 'no-store' } })
          } catch (error) {
            const message = String((error && error.message) || error)
            console.error('omaseek: reading themes.md failed — ' + message)
            return Response.json({ error: message }, { status: 500 })
          }
        },
      })
    }, 'omaseek: theme route')
  })
}
