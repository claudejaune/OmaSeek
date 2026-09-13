#!/usr/bin/env node
/**
 * Parse the research tables in themes.md and emit the compact theme table the
 * OmaSeek client plugin embeds.
 *
 * Sources inside themes.md:
 *   §2    id ↔ display name ↔ color-scheme        (| 1 | `tokyo-night` | Tokyo Night | `dark` | …)
 *   §4.1  `--t-text-muted` row                    → label-tertiary
 *   §5.2  `--t-field-bg` row                      → input field
 *   §7.2  the 13 native DSH token rows            → the native palette
 *
 * Output: tools/themes.generated.js  (array of [id, name, scheme, [14 hex…]])
 *
 * Column order (mirrored by the plugin's PALETTE_KEYS constant):
 *   bg, bgDeep, surface, surface2, borderSubtle, borderStrong, brand,
 *   text, textSecondary, textMuted, fieldBg, error, success, warn
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(new URL(import.meta.url).pathname), '..')
const md = readFileSync(join(ROOT, 'packages/omaseek-themes/themes.md'), 'utf8')
const lines = md.split('\n')

/** Split one markdown table row into trimmed cells (drops the outer pipes). */
function cells(line) {
  return line.split('|').slice(1, -1).map((c) => c.trim())
}

/** Strip the `` ` `` wrappers and inline notes from a table cell value. */
function color(cell) {
  const raw = cell.replace(/`/g, '').split('(')[0].trim()
  return raw
}

/** Locate the header row of a section (first table header after a heading). */
function headerAfter(heading, labelCols) {
  const start = lines.findIndex((l) => l.startsWith(heading))
  if (start < 0) throw new Error(`heading not found: ${heading}`)
  const headerIndex = lines.findIndex((l, i) => i > start && l.startsWith('|') && l.includes('Tokyo Night'))
  if (headerIndex < 0) throw new Error(`no theme header after: ${heading}`)
  // §4.1 has two label columns (part + token); §5.2/§7.2 have one.
  return cells(lines[headerIndex]).slice(labelCols)
}

/** Rows of one section keyed by the first cell, values keyed by display name. */
function table(heading, rowMatcher, labelCols) {
  const names = headerAfter(heading, labelCols)
  const out = new Map()
  const start = lines.findIndex((l) => l.startsWith(heading))
  // Walk only the section's own table: the first non-table line ends it.
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.startsWith('|')) continue
    const row = cells(line)
    if (!rowMatcher(row[0])) continue
    if (row.length < names.length + labelCols) continue // a different, narrower table
    const values = {}
    names.forEach((name, index) => { values[name] = color(row[labelCols + index]) })
    out.set(row[0].replace(/`/g, '').split('←')[0].trim(), values)
  }
  return out
}

/** First row of a table whose label contains `needle`. */
function pick(map, needle) {
  for (const [key, values] of map) if (key.includes(needle)) return values
  throw new Error(`no row matching "${needle}"`)
}

// §2 — id, display name, scheme, in Omarchy picker order.
const ids = []
for (const line of lines) {
  const m = line.match(/^\|\s*(\d+)\s*\|\s*`([a-z0-9-]+)`\s*\|\s*([^|]+?)\s*\|\s*`(light|dark)`\s*\|/)
  if (m) ids.push({ order: Number(m[1]), id: m[2], name: m[3], scheme: m[4] })
}
ids.sort((a, b) => a.order - b.order)
if (ids.length !== 22) throw new Error(`expected 22 themes in §2, got ${ids.length}`)

const native = table('### 7.2', (label) => label.startsWith('`--dsw-'), 1)
const muted = table('### 4.1', (label) => label.includes('Muted text'), 2)
const fields = table('### 5.2', (label) => label.includes('Text input field'), 1)

const NATIVE_ROWS = [
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
const ORDER = [
  'bg', 'bgDeep', 'surface', 'surface2', 'borderSubtle', 'borderStrong',
  'brand', 'text', 'textSecondary', 'textMuted', 'fieldBg', 'error', 'success', 'warn',
]

const rows = ids.map(({ id, name, scheme }) => {
  const palette = {}
  for (const [token, key] of NATIVE_ROWS) {
    const row = native.get(token) // §7.2 rows are keyed by the DSH token itself
    if (row === undefined) throw new Error(`§7.2 row missing: ${token}`)
    palette[key] = row[name]
  }
  palette.textMuted = pick(muted, 'Muted text')[name]
  palette.fieldBg = pick(fields, 'Text input field')[name]
  const values = ORDER.map((key) => {
    const value = palette[key]
    if (typeof value !== 'string' || value.length === 0) throw new Error(`${id}/${key} empty`)
    return value
  })
  return { id, name, scheme, values }
})

const named = rows.map((r) => `  ['${r.id}', '${r.name}', '${r.scheme}', ${JSON.stringify(r.values)}]`)
const out = `/**
 * GENERATED by tools/extract-theme-table.mjs — do not edit by hand.
 * Source: packages/omaseek-themes/themes.md §2 / §4.1 / §5.2 / §7.2.
 * One entry per Omarchy home-page theme: [id, display name, color scheme, palette]
 * Palette slot order (PALETTE_KEYS in the plugin):
 *   ${ORDER.join(', ')}
 */
export const OMARCHY_THEMES = [
${named.join(',\n')}]
`
mkdirSync(dirname(join(ROOT, 'tools/themes.generated.js')), { recursive: true })
writeFileSync(join(ROOT, 'tools/themes.generated.js'), out)
console.log(`wrote ${rows.length} themes (${rows.filter(r => r.scheme === 'dark').length} dark / ${rows.filter(r => r.scheme === 'light').length} light)`)
