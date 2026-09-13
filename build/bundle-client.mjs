#!/usr/bin/env node
/**
 * Bundle OmaSeek's browser half into the one form the harness will load.
 *
 * The client-module system serves a browser plugin as a closure factory:
 * `window.__ModuleLoader__.load({ id, factory })`, where the factory receives a
 * synchronous `require` into the page's module table. React and the Cordis UI
 * libraries are *externals* resolved through that require — a plugin that
 * bundled its own React would mount a second copy of the framework beside the
 * shell's.
 *
 * The harness's own preset (`packages/client/tsdown.client.ts`) is not
 * published, so this file reproduces the part of OmaSeek needs and nothing
 * else: rewrite our own ESM into a tiny module registry, keep bare specifiers
 * as `require` calls, and hand the entry's exports back as the package's. Our
 * source style is constrained to make that safe — the rules are in README.md
 * under "Source rules for `src/client/`".
 *
 * Two lessons are baked in. The generator must never emit a bundle it has not
 * compiled (an earlier version shipped a named import scoped inside a block,
 * and `node --check` does not look inside a factory body), and it must read
 * structure rather than raw text (the word `import` in a comment is not an
 * import, and a trailing semicolon is not an error). Comments, string contents
 * and template contents are blanked before scanning; anything the scanner
 * cannot express is a thrown error naming the file, never a silent pass.
 *
 * Output: lib/client.js. Nothing here touches the Node half, which ships as
 * plain ESM straight out of src/.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(ROOT, 'src')
const ENTRY = resolve(SRC, 'client.js')
const OUT = resolve(ROOT, 'lib/client.js')

/** The id the page will know this bundle by: the package's own name. */
const PACKAGE_ID = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8')).name

/** Module-table entries the page seeds; everything else must be ours. */
const BASELINE = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
])

/** Canonical module id: the path under src/, forward slashes. */
const keyOf = (file) => relative(SRC, file).split(/[\\/]+/).join('/')

/**
 * Blank out comments and the *contents* of string and template literals.
 *
 * Delimiters survive, so offsets and quotes still line up with the original and
 * the scanner can tell code from prose. Template contents are blanked whole:
 * a `${…}` holding an import would be invisible to this pass, which is one more
 * reason the source style forbids it.
 */
function blankNonCode(source) {
  const out = source.split('')
  const blank = (at) => { if (at < out.length) out[at] = ' ' }
  let i = 0
  let state = 'code'
  while (i < source.length) {
    const char = source[i]
    const next = source[i + 1]
    if (state === 'code') {
      if (char === '/' && next === '/') { blank(i); blank(i + 1); i += 2; state = 'line'; continue }
      if (char === '/' && next === '*') { blank(i); blank(i + 1); i += 2; state = 'block'; continue }
      if (char === "'" || char === '"' || char === '`') { i += 1; state = char === "'" ? 'single' : char === '"' ? 'double' : 'template'; continue }
      i += 1
      continue
    }
    if (state === 'line') {
      blank(i)
      if (char === '\n') state = 'code'
      i += 1
      continue
    }
    if (state === 'block') {
      if (char === '*' && next === '/') { blank(i); blank(i + 1); i += 2; state = 'code'; continue }
      blank(i)
      i += 1
      continue
    }
    const quote = state === 'single' ? "'" : state === 'double' ? '"' : '`'
    if (char === '\\') { blank(i); blank(i + 1); i += 2; continue }
    if (char === quote) { i += 1; state = 'code'; continue }
    blank(i)
    i += 1
  }
  return out.join('')
}

function fail(id, message) {
  throw new Error(`${id}: ${message}`)
}

/** Walk past spaces, tabs, an optional semicolon and a trailing comment. */
function statementEnd(masked, from) {
  let i = from
  while (i < masked.length && (masked[i] === ' ' || masked[i] === '\t')) i += 1
  if (masked[i] === ';') {
    i += 1
    while (i < masked.length && (masked[i] === ' ' || masked[i] === '\t')) i += 1
  }
  return i
}

/** Every `import` statement, as source ranges plus the specifier text. */
function findImports(id, source, masked) {
  const found = []
  const keyword = /(^|\n)[ \t]*import\b/g
  let match
  while ((match = keyword.exec(masked)) !== null) {
    const start = match.index + match[1].length
    let i = start + 'import'.length
    while (masked[i] === ' ' || masked[i] === '\t') i += 1
    const quote = masked[i]
    if (quote === "'" || quote === '"') {
      // A side-effect import: `import './setup.js'`.
      const close = source.indexOf(quote, i + 1)
      if (close < 0) fail(id, 'unterminated import specifier')
      found.push({ start, end: statementEnd(masked, close + 1), specifier: source.slice(i + 1, close), clause: '' })
      keyword.lastIndex = close + 1
      continue
    }
    let depth = 0
    let from = -1
    for (i = start + 'import'.length; i < masked.length; i += 1) {
      const char = masked[i]
      if (char === '{') depth += 1
      else if (char === '}') depth -= 1
      else if (char === '\n' && depth === 0 && from < 0) fail(id, 'an import statement never reaches `from`')
      else if (depth === 0 && masked.startsWith('from', i) && !/[\w$]/.test(masked[i - 1] || '') && !/[\w$]/.test(masked[i + 4] || '')) {
        from = i
        break
      }
    }
    if (from < 0) fail(id, 'an import statement never reaches `from`')
    let quoteAt = from + 'from'.length
    while (masked[quoteAt] === ' ' || masked[quoteAt] === '\t') quoteAt += 1
    const openQuote = masked[quoteAt]
    if (openQuote !== "'" && openQuote !== '"') fail(id, '`from` is not followed by a quoted specifier')
    const close = source.indexOf(openQuote, quoteAt + 1)
    if (close < 0) fail(id, 'unterminated import specifier')
    const clause = source.slice(start + 'import'.length, from).trim()
    found.push({ start, end: statementEnd(masked, close + 1), specifier: source.slice(quoteAt + 1, close), clause })
    keyword.lastIndex = close + 1
  }
  return found
}

/** Every `export` statement, as source ranges plus the names it declares. */
function findExports(id, source, masked) {
  const found = []
  const keyword = /(^|\n)[ \t]*export\b/g
  let match
  while ((match = keyword.exec(masked)) !== null) {
    const start = match.index + match[1].length
    const after = masked.slice(start + 'export'.length)
    if (/^\s+default\b/.test(after)) fail(id, '`export default` is not supported — export by name')
    if (/^\s*\*/.test(after)) fail(id, '`export *` is not supported — export by name')
    if (/^\s*\{/.test(after)) {
      const close = after.indexOf('}')
      if (close < 0) fail(id, 'unterminated `export { … }`')
      const names = after.slice(after.indexOf('{') + 1, close).split(',')
        .map((part) => part.trim()).filter(Boolean)
        .map((part) => {
          const [imported, local = imported] = part.split(/\s+as\s+/).map((p) => p.trim())
          return { imported, local }
        })
      const tail = after.slice(close + 1)
      if (/^\s*from\b/.test(tail)) fail(id, '`export { … } from` is not supported — re-export by name')
      found.push({ start, end: statementEnd(masked, start + 'export'.length + close + 1), names })
      keyword.lastIndex = start + 'export'.length + close + 1
      continue
    }
    const declaration = /^\s+(?:async\s+)?(function\s*\*?|class|const|let|var)\s+([A-Za-z0-9_$]+)/.exec(after)
    if (declaration === null) fail(id, 'unsupported `export` form — use `export function name` or `export const name`')
    if (declaration[1] === 'const' || declaration[1] === 'let' || declaration[1] === 'var') {
      // A second declarator would export silently as one name, so it is an error.
      const line = masked.slice(start).split('\n')[0]
      if (/,/.test(line.replace(/^[^=]*=/, '').split(/[([{]/)[0])) {
        fail(id, '`export const a = …, b = …` is not supported — one declaration per export')
      }
    }
    found.push({ start, end: afterExport(masked, start), names: [{ imported: declaration[2], local: declaration[2] }] })
    keyword.lastIndex = start + 'export'.length
  }
  return found
}

/** The `export` keyword and the whitespace after it, so the line keeps its indent. */
function afterExport(masked, start) {
  let end = start + 'export'.length
  while (masked[end] === ' ' || masked[end] === '\t') end += 1
  return end
}

/** Resolve a specifier to a canonical src/ key, or to a bare external id. */
function resolveSpecifier(id, file, specifier) {
  if (!specifier.startsWith('.')) {
    if (!BASELINE.has(specifier)) {
      fail(id, `"${specifier}" is neither a relative module nor a client-baseline external `
        + '(React and the Cordis UI libraries come from the page; everything else must live in src/)')
    }
    return { external: true, id: specifier }
  }
  const base = resolve(dirname(file), specifier)
  const candidate = existsSync(base) ? base : existsSync(`${base}.js`) ? `${base}.js` : null
  if (candidate === null) fail(id, `cannot resolve "${specifier}"`)
  return { external: false, id: keyOf(candidate), file: candidate }
}

/**
 * Read one source file and rewrite it into a factory body.
 * @returns the module record, or null when the file was already visited.
 */
async function transform(file, visited, stack) {
  const id = keyOf(file)
  if (visited.has(id)) return null
  visited.add(id)
  stack.push(id)

  const source = await readFile(file, 'utf8')
  const masked = blankNonCode(source)

  const edits = []
  const dependencies = []
  for (const statement of findImports(id, source, masked)) {
    const target = resolveSpecifier(id, file, statement.specifier)
    let replacement = ''
    if (statement.clause !== '') {
      replacement = rewriteClause(id, statement.clause, `__req(${JSON.stringify(target.id)})`)
    } else if (target.external) {
      fail(id, `"${statement.specifier}" is imported for its side effects, but a page module cannot be one`)
    } else {
      replacement = `__req(${JSON.stringify(target.id)})`
    }
    if (!target.external) dependencies.push(target.file)
    edits.push({ start: statement.start, end: statement.end, text: replacement })
  }

  // Each export becomes an assignment out of the module record; the declaration
  // itself stays exactly where the author put it. `imported` is the local
  // binding, `local` is the name it goes out under (`a as b` exports `a` as `b`).
  const exported = []
  for (const statement of findExports(id, source, masked)) {
    for (const name of statement.names) exported.push(name)
    edits.push({ start: statement.start, end: statement.end, text: '' })
  }

  let body = applyEdits(source, edits)
  for (const name of exported) body += `\nexports[${JSON.stringify(name.local)}] = ${name.imported}\n`

  const residual = /^[ \t]*(?:import|export)\b/m.exec(blankNonCode(body))
  if (residual !== null) fail(id, `an import/export survived the rewrite: ${JSON.stringify(residual[0].trim())}`)

  const modules = []
  for (const dependency of dependencies) {
    if (stack.includes(keyOf(dependency))) {
      console.warn(`omaseek: ${id} and ${keyOf(dependency)} import each other; `
        + 'the later binding is undefined at materialisation (real ESM would throw)')
    }
    const child = await transform(dependency, visited, stack)
    if (child !== null) modules.push(child)
  }
  stack.pop()
  return { id, body, modules }
}

/** Turn one import clause into the bindings the factory body uses. */
function rewriteClause(id, clause, required) {
  const text = clause.trim()
  if (text.startsWith('{')) {
    const close = text.indexOf('}')
    if (close < 0) fail(id, `unterminated named import: ${clause}`)
    if (text.slice(close + 1).trim() !== '') fail(id, `unsupported import clause: ${clause}`)
    return namedBindings(id, text.slice(0, close + 1), required).join('\n')
  }
  if (text.startsWith('*')) {
    const alias = text.replace(/^\*\s*as\s+/, '').trim()
    if (!/^[A-Za-z0-9_$]+$/.test(alias)) fail(id, `unsupported namespace import: ${clause}`)
    return `const ${alias} = ${required}`
  }
  const comma = text.indexOf(',')
  const defaultName = (comma < 0 ? text : text.slice(0, comma)).trim()
  if (!/^[A-Za-z0-9_$]+$/.test(defaultName)) fail(id, `unsupported import clause: ${clause}`)
  const lines = [`const ${defaultName} = ${required}`]
  if (comma >= 0) {
    const tail = text.slice(comma + 1).trim()
    if (tail.startsWith('{')) lines.push(...namedBindings(id, tail, defaultName))
    else if (tail.startsWith('*')) lines.push(`const ${tail.replace(/^\*\s*as\s+/, '').trim()} = ${defaultName}`)
    else fail(id, `unsupported import clause: ${clause}`)
  }
  return lines.join('\n')
}

/** `{ a, b as c }` against a module object or a default-imported namespace. */
function namedBindings(id, clause, subject) {
  if (!clause.startsWith('{')) fail(id, `unsupported import clause: ${clause}`)
  const close = clause.indexOf('}')
  if (close < 0) fail(id, 'unterminated named import')
  return clause.slice(1, close).split(',').map((part) => part.trim()).filter(Boolean).map((part) => {
    const [imported, local = imported] = part.split(/\s+as\s+/).map((p) => p.trim())
    if (!/^[A-Za-z0-9_$]+$/.test(imported) || !/^[A-Za-z0-9_$]+$/.test(local)) {
      fail(id, `unsupported named import: ${part}`)
    }
    return `const ${local} = ${subject}.${imported}`
  })
}

/** Apply non-overlapping source edits, latest first so offsets stay valid. */
function applyEdits(source, edits) {
  const ordered = [...edits].sort((a, b) => b.start - a.start)
  let out = source
  for (const edit of ordered) out = out.slice(0, edit.start) + edit.text + out.slice(edit.end)
  return out
}

/* ── walk the graph, then emit ─────────────────────────────────────────── */

const entry = await transform(ENTRY, new Set(), [])
const modules = []
;(function flatten(module) {
  for (const child of module.modules) flatten(child)
  modules.push(module)
})(entry)

const out = [
  'window.__ModuleLoader__.load({',
  `\tid: ${JSON.stringify(PACKAGE_ID)},`,
  '\tfactory: (require) => {',
  '\t\tvar module = { exports: {} };',
  '\t\tvar exports = module.exports;',
  '\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
  '\t\tconst __defs = Object.create(null);',
  '\t\tconst __cache = Object.create(null);',
  '\t\tfunction __req(id) {',
  '\t\t\tif (id in __cache) return __cache[id].exports;',
  '\t\t\tconst def = __defs[id];',
  '\t\t\tif (def === undefined) return require(id);',
  '\t\t\tconst record = { exports: {} };',
  '\t\t\t__cache[id] = record;',
  '\t\t\tdef(record, record.exports, __req);',
  '\t\t\treturn record.exports;',
  '\t\t}',
  ...modules.map((m) => `\t__defs[${JSON.stringify(m.id)}] = (module, exports, __req) => {\n${m.body}\t};`),
  `\tconst __entry = __req(${JSON.stringify(entry.id)});`,
  '\tif (typeof __entry.apply !== "function") {',
  `\t\tthrow new Error(${JSON.stringify(PACKAGE_ID + ': client entry exports no apply()')});`,
  '\t}',
  '\tfor (const key of Object.keys(__entry)) exports[key] = __entry[key];',
  '\treturn module.exports;',
  '\t},',
  '});',
  '',
].join('\n')

// A bundle that does not compile is a bundle the page will reject at load, so
// it never reaches disk. `node --check` is not enough: it does not look inside
// a factory body, which is where every rewritten module lives.
try {
  new Function('window', out)
} catch (error) {
  throw new Error(`${PACKAGE_ID}: generated bundle does not compile — ${error.message}`)
}

await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, out, 'utf8')
const kb = Buffer.byteLength(out) / 1024
console.log(`${PACKAGE_ID}: lib/client.js — ${modules.length} modules, ${kb.toFixed(1)} KiB`)
