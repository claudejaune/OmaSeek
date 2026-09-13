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
 * published, so this file reproduces the part of it OmaSeek needs and nothing
 * else: rewrite our own ESM into a tiny module registry, keep bare specifiers
 * as `require` calls, and hand `apply` back as the package's exports. Our
 * source style is constrained to make that safe — the rules are in README.md
 * under "Source rules for `src/client/`".
 *
 * Output: lib/client.js. Nothing here touches the Node half, which ships as
 * plain ESM straight out of src/.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(ROOT, 'src')
const ENTRY = resolve(SRC, 'client.js')
const OUT = resolve(ROOT, 'lib/client.js')
const PACKAGE_ID = 'omaseek'

/** Imports the source files may use: bare specifiers go to the module table. */
const IMPORT_RE = /^[ \t]*import[\s\S]*?from\s*['"]([^'"]+)['"][ \t]*\n/gm
const EXPORT_FROM_RE = /^[ \t]*export\s+\{[^}]*\}\s+from\s/m
/** The only export forms we allow, so the emitter can find them by name. */
const EXPORT_RE = /^[ \t]*export\s+(?:async\s+)?(?:function\*?|const|let|var)\s+([A-Za-z0-9_$]+)/gm

/** The module id the page knows a bare specifier by, if it is one at all. */
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

/** Canonical module id: path under src/, forward slashes. */
const keyOf = (file) => relative(SRC, file).split(/[\\/]+/).join('/')

/**
 * Read one source file and rewrite it into a factory body.
 * @returns {{ id: string, body: string, deps: string[] }}
 */
async function transform(file, seen) {
  const id = keyOf(file)
  if (seen.has(id)) return null
  seen.add(id)

  const source = await readFile(file, 'utf8')
  if (EXPORT_FROM_RE.test(source)) {
    throw new Error(`${id}: \`export { … } from\` is not supported — re-export by name`)
  }

  const deps = []
  // Each import line becomes a set of `const x = require('<id>')` bindings.
  let body = source.replace(IMPORT_RE, (match, specifier) => {
    let target
    if (specifier.startsWith('.')) {
      target = keyOf(resolve(dirname(file), specifier))
      deps.push(target)
    } else if (BASELINE.has(specifier)) {
      target = specifier
    } else {
      throw new Error(
        `${id}: "${specifier}" is neither a relative module nor a client-baseline `
        + 'external (React and the Cordis UI libraries come from the page, everything '
        + 'else must live in src/)',
      )
    }
    const clause = match.slice(match.indexOf('import') + 6).replace(/from\s*['"][^'"]+['\"]\s*$/, '').trim()
    const required = `__req(${JSON.stringify(target)})`
    if (clause === '') return ''
    if (/^\{/.test(clause)) {
      const names = clause.slice(1, -1).split(',').map((part) => part.trim()).filter(Boolean)
      const bindings = names.map((name) => {
        const [imported, local = imported] = name.split(/\s+as\s+/).map((p) => p.trim())
        return `const ${local} = __m.${imported}`
      })
      return `{\nconst __m = ${required};\n${bindings.join('\n')}\n/* bound imports */}\n`
    }
    // `import React from 'react'` and `import React, { useState } from 'react'`
    const local = clause.split(',')[0].trim()
    const rest = clause.includes(',') ? clause.slice(clause.indexOf(',') + 1).trim() : ''
    let out = `const ${local.replace(/^\*\s+as\s+/, '')} = ${required}\n`
    if (rest !== '') {
      const names = rest.slice(1, -1).split(',').map((part) => part.trim()).filter(Boolean)
      out += names.map((name) => {
        const [imported, alias = imported] = name.split(/\s+as\s+/).map((p) => p.trim())
        return `const ${alias} = ${local}.${imported}`
      }).join('\n') + '\n'
    }
    return out
  })

  // `export` becomes an assignment out of the module record; the declaration
  // itself stays exactly where the author put it.
  const exported = []
  body = body.replace(EXPORT_RE, (match, name) => {
    exported.push(name)
    return match.replace(/^[ \t]*export\s+/, '')
  })
  for (const name of exported) body += `\nexports[${JSON.stringify(name)}] = ${name}\n`

  // Recurse only after this file is marked, so a cycle is loud, not silent.
  for (const dep of [...deps]) {
    const child = await transform(resolve(SRC, dep.endsWith('.js') ? dep : dep + '.js'), seen)
    if (child !== null) modules.push(child)
  }
  return { id, body, deps }
}

const modules = []
const seen = new Set()
const entry = await transform(ENTRY, seen)
modules.push(entry)

const out = [
  'window.__ModuleLoader__.load({',
  `\tid: ${JSON.stringify(PACKAGE_ID)},`,
  '\tfactory: (require) => {',
  '\t\tvar module = { exports: {} };',
  '\t\tvar exports = module.exports;',
  '\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
  '\t\tconst __defs = {};',
  '\t\tconst __cache = {};',
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
  '\texports.apply = __entry.apply;',
  '\tif (__entry.inject !== undefined) exports.inject = __entry.inject;',
  '\treturn module.exports;',
  '\t},',
  '});',
  '',
].join('\n')

await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, out, 'utf8')
const kb = (await import('node:buffer')).Buffer.byteLength(out) / 1024
console.log(`omaseek: lib/client.js — ${modules.length} modules, ${kb.toFixed(1)} KiB`)
