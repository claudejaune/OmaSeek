# Contributing

The repository's layout, how the browser halves are built and tested, and how a release goes
out.

## What is in here


| Path | What it is |
|---|---|
| `packages/omaseek-themes/` | The 22 themes, the scheme-aware picker, the corner shapes — and `themes.md`, the palette research behind them |
| `packages/omaseek-pixel/` | The hero headline rotation and the pixel field |
| `packages/omaseek-music/` | The now-playing card and the two routes that feed it |
| `build/` | The bundler that turns each browser half into what the harness serves, and the test suite |
| `tools/` | The palette-table extractor and its generated snapshot |
| `docs/` | This file, and [how-it-works.md](how-it-works.md) |
| `themes.md` | The palette research, inside the themes package: every color, and the harness tokens it maps to |

Each package is self-contained: its own Node half, its own browser half, its own built bundle
and its own row. Any one of them runs on its own.

## Building


```
pnpm build      # writes each package's lib/client.js
pnpm smoke      # runs every bundle the way the page does
pnpm check      # both
```

Each `lib/client.js` **is committed**. Git installs fetch sources, not built artifacts, and
pnpm refuses to run a git dependency's build script until the user allowlists it — so
committing the bundles is what lets `plugin add github:…` work with no build permission
and no prompt. `pnpm -r publish` rebuilds them through `prepack` anyway, so the npm tarballs
are never stale.

**Source rules for a browser half** (the bundler enforces them and fails loudly):

- Plain JavaScript ESM. No TypeScript, no JSX.
- Imports are `react` — which comes off the page's module table, never a bundled copy — or a
  relative `.js` path inside that package. Nothing else: a second React or a second Cordis in
  the page would break the shell's own state.
- Only `export function name(…)` and `export const name = …`. No default exports, no
  `export { … } from`, no side-effect imports.
- A browser half cannot import from a sibling package — each bundle is its own world — so the
  few shared helpers (`h`, `createNotifier`, the sheet and fetch seams, the color blend) live
  in each package that needs them.

The Node halves are not built at all: each ships as the ESM its `main` points at, and each
resolves its own data (`themes.md`, the music file) relative to the installed package.

## Verifying the theme table


```
node tools/extract-theme-table.mjs
```

Parses the same tables independently and rewrites `tools/themes.generated.js`, a flat
snapshot of all 22 × 14 source colors. Commit it after editing `themes.md` so a palette
change shows up as a reviewable diff; no runtime code imports it — the Node half parses
`themes.md` directly, so the doc stays the only place a hex value is written.

## Releasing


```
pnpm -r publish --access public     # or: pnpm publish:all
```

Three packages, three names, one command: `omaseek-themes`, `omaseek-pixel` and
`omaseek-music`. `prepack` rebuilds each bundle first. For a git-based release, tag the
commit (`git tag v0.1.0 && git push --tags`) so users can pin a folder:
`npx @deepseek-ai/dsh plugin --profile web add "github:claudejaune/OmaSeek#v0.1.0&path:/packages/omaseek-pixel"`.
