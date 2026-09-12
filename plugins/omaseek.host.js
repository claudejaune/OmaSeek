/**
 * OmaSeek — Omarchy home-page themes for DeepSeek Harness. Host half.
 *
 * Reads the palette research doc (`themes.md`) and serves the 22 home-page
 * themes to this Package's Client half. The doc is the single source of truth:
 * editing a hex value there and re-running the Package is all it takes to
 * change a palette, so no color list is duplicated into plugin code.
 *
 * Plain JavaScript only (no import/require/TS). `fs` is an optional Service.
 */

/** The research doc. Absolute path of the OmaSeek checkout in this session. */
var DOC_PATH = './themes.md'

/** Palette slots served per theme, in the order the Client decodes them. */
var KEYS = [
  'bg', 'bgDeep', 'surface', 'surface2', 'borderSubtle', 'borderStrong',
  'brand', 'text', 'textSecondary', 'textMuted', 'fieldBg', 'error', 'success', 'warn',
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
  var muted = table(lines, '### 4.1', 2, 'Muted text')
  var fields = table(lines, '### 5.2', 1, 'Text input field')

  return entries.map(function (entry) {
    var palette = {}
    for (var t = 0; t < NATIVE_ROWS.length; t += 1) {
      var name = NATIVE_ROWS[t][0]
      var row = Object.prototype.hasOwnProperty.call(native, name) ? native[name] : undefined
      if (row === undefined) throw new Error('\u00a77.2 row missing: ' + name)
      palette[NATIVE_ROWS[t][1]] = row[entry.name]
    }
    palette.textMuted = pick(muted, 'Muted text')[entry.name]
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

return {
  apply(ctx) {
    ctx.effect(function () {
      return harness.handle('omaseek.themes', async function (args) {
        var path = typeof args === 'string' && args.length > 0 ? args : DOC_PATH
        var fileSystem = ctx.get('fs')
        if (fileSystem === undefined) throw new Error('the "fs" Service is not available on this Host')
        var target = await fileSystem.resolve(path)
        var text = await fileSystem.readText(target)
        var themes = parseThemes(text)
        console.log('served ' + themes.length + ' themes from ' + path)
        return { path: path, themes: themes }
      })
    }, 'omaseek: themes RPC')
  },
}
