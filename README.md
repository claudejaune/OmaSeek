# OmaSeek

Omarchy's home page, for DeepSeek Harness: its 22 palettes, its hero pixel field, and its
now-playing card.

Three plugins, one repository — install any of them, or all three:

- **OmaSeek** — the 22 Omarchy home-page themes as registered harness themes, with a
  scheme-aware picker in **Settings → OmaSeek** and the Omarchy corner radii.
- **OmaPixel** — the New Session hero's headline typewriter and the omarchy.org pixel field
  behind it. **Settings → OmaPixel**: field Off/Ambient/Interactive, headline Loop/Once.
- **OmaMusic** — the site's now-playing card, over a track you point it at. It has no settings
  page of its own: the card sits in the corner, and `OMASEEK_MUSIC_PATH` decides what plays.

`themes.md` in this repo is the research behind the palettes — every color of every theme,
plus how each one maps onto a harness theme token. It is the **source of truth**: the Node
half reads it at request time, so editing a hex there and reloading is all it takes to
change a palette.

## Install

```
dsh plugin --profile web add omaseek-themes omaseek-pixel omaseek-music     # all three
dsh plugin --profile web add omaseek-pixel                                 # just the hero field
```

Then restart the harness. Each plugin is its own package with its own row, so they appear —
and load, enable and reload — separately on the Plugins page. Anything you have not added is
simply not there; none of them needs the others.

Straight from GitHub, without publishing anything:

```
dsh plugin --profile web add "github:claudejaune/OmaSeek#path:/packages/omaseek-pixel"
```

Or from a checkout: `dsh plugin --profile web add ./packages/omaseek-pixel`.
Remove one with `dsh plugin --profile web remove omaseek-pixel`.

## What is in here

| Path | What it is |
|---|---|
| `packages/omaseek-themes/` | The 22 themes, the scheme-aware picker, the corner shapes — and `themes.md`, the palette research behind them |
| `packages/omaseek-pixel/` | The hero headline rotation and the pixel field |
| `packages/omaseek-music/` | The now-playing card and the two routes that feed it |
| `build/` | The bundler that turns each browser half into what the harness serves, and the test suite |
| `tools/` | The palette-table extractor and its generated snapshot |

Each package is self-contained: its own Node half, its own browser half, its own built bundle
and its own row. There is no umbrella package — "install all three" is one command with three
names, so taking one of them is a first-class choice rather than a special case.

The features were first built as **dynamic Cordis packages** — defined and run inside one
session, re-definable while the process lives. That path has no install story: a dynamic
package dies with the process and cannot be published. The packages here are the supported
copy, and the dynamic originals live in this checkout under `plugins/` (deliberately
untracked, since they are the same features a second time).

## The features

### OmaSeek — the themes

Every theme is registered with `theme.register({ id, colorScheme, tokens })` and contributes
the **Settings → OmaSeek** page: scheme chips, one card per theme with a live miniature of
its palette, the active one marked.

**It opens on Catppuccin.** With nothing chosen, a light UI gets **Catppuccin Latte** and a
dark one gets **Catppuccin** — the pair Omarchy itself opens on. The picker follows the
scheme rather than the click: switching Light ↔ Dark re-applies that scheme's palette, and
each scheme remembers its own choice, so a light pick is never a statement about what a dark
UI should wear.

**The choice survives a reload**, which the harness alone cannot do: `theme.setTheme()`
persists only its own `light`/`dark`/`system` preference, so an Omarchy palette would be
forgotten on every reload. The picker keeps its own note in `localStorage` under
`omaseek.themes`, one slot per scheme. Clearing site data, or pressing **System**, returns
both schemes to automatic.

**Opting out is a click.** The **Light** and **Dark** chips are the harness's own palettes,
and choosing one for a scheme also tells the picker to stop painting over it — otherwise the
automatic Catppuccin would come straight back on the next scheme change.

Each theme is registered with the `colorScheme` Omarchy assigns it, so every theme is half
of a pair — a dark theme has no light variant. The picker therefore reads
`getTheme().active.colorScheme` and lists only the themes belonging to the scheme now in
force: the **5 light** palettes (`catppuccin-latte`, `flexoki-light`, `lupine`, `rose-pine`,
`white`) while the app is light, the **17 dark** ones while it is dark. The Light / Dark /
System chips switch the scheme — and with it, which set you can pick from.

The token pairs in `Theme.listTokens` are *not* this mechanism: a pair is one active theme's
own light and dark values, not two themes.

### OmaPixel — the hero

**The headline.** The site's `TypewriterTail` rhythm, ported: type a phrase, hold 2.1 s,
delete back to the front the current phrase and the next share — "We can fix every" — and
type on, forever, with the site's per-key jitter, word pauses, and occasional hesitate. The
typewriter owns the shipped title span's `textContent` while it runs and puts the product's
own text back on stop.

**The field.** The New Session hero sits in the omarchy.org hero's field: a lattice of square
cells whose resting luminance comes from a drifting value-noise blob, dithered down to those
cells with the same 8×8 Bayer matrix the site uses, lit further by the cursor, and stamped by
a press with the Omarchy mark growing out of the click point and dissolving back through the
dither. Ported from omarchy.org's own `HeroPixelField.tsx`.

It is the site's field, not an impression of it:

- **The ramp is the site's**, per axis: `nx = (x − cx) / (width / 2)`, `ny = (y − h/2) / (h/2)`,
  the clear oval `(rr − 0.42) / 0.85` eased², and the vertical gradient
  `clamp((y − 24) / 130, 0.16, 1)` that keeps the top of the panel at 16 % and fades it in.
- **The cells are derived, not fixed**: one cell is the wordmark slot (88 % of the panel less
  a 48 px inset, capped at 896 px) over its **81** columns — about 11 CSS px, the site's own
  density. A hard-coded 8 px cell is what made an earlier revision read as twice as busy.
- **Nothing is clipped.** The canvas covers the panel and the ramp alone carves the clear
  column, so there is no straight internal edge anywhere in the field.

Three pieces of the site's hero are deliberately left behind: the wordmark reveal is `ttfx`, a
WASM terminal engine the site loads as `/ttfx/0.3.2/ttfx.js` plus `effects/all.wasm`, and
there is no Omarchy wordmark here to reveal; the music spectrum belongs to OmaMusic; and the
wandering sprite that stamps the site's field while nobody is looking stays on the site —
this field answers the user and nothing else.

**Where it is mounted.** There is no backdrop Slot on the hero — `conversation.hero.*` only
offers the brand mark, the workspace picker and the agent-preset control — so the canvas is a
`z-index:-1` child of the conversation root while that root is in its `hero` phase, found
through `[data-phase="hero"]`. A `z-index:-1` child paints above the panel's own background
and below everything the harness draws, and the host is given `isolation:isolate` because
without a stacking context of its own the negative cell lands behind that background instead.
No product element is restacked and no Slot is replaced; a `MutationObserver` on `data-phase`
remounts the field as the hero arrives with the route and leaves with the first message.

**Switching it.** Settings → OmaPixel has two rows. **Pixel field**: `Off` runs nothing,
`Ambient` is the drifting lattice alone, and `Interactive` adds the cursor glow and the press
stamp. **Headline**: `Loop` is the site's rotation above, and `Once` is the earlier
behaviour — one random phrase per load, typed once, then still.

### OmaMusic

The site's now-playing card, driven by a local file rather than a stream: the Node half reads
it in chunks and the browser half plays it through an `Audio` element, painting the spectrum
the card animates.

**It ships no music** — the track omarchy.org plays is
[Kevin Koontz's](https://x.com/koozeex1), and it is not ours to ship. Point the plugin at a
file of your own instead:

```sh
OMASEEK_MUSIC_PATH=/home/you/Music/track.mp3          # what plays (required for sound)
OMASEEK_MUSIC_ART=/home/you/Music/track.webp          # optional: album art
OMASEEK_MUSIC_TIMELINE=/home/you/Music/track.json     # optional: analysed spectrum
```

The two extras belong to the track they were made for, so both are optional: without art the
card draws its own plate, and without a timeline the meter follows the live audio and the
duration comes off the file itself. With nothing set at all the card stays silent and says
so, rather than throwing.

`assets/` in this checkout keeps the site's own copies for development, untracked — see
`.gitignore` for why they are not in the repository.

## Building

```
pnpm build      # writes each package's lib/client.js
pnpm smoke      # runs every bundle the way the page does
pnpm check      # both
```

Each `lib/client.js` **is committed**. Git installs fetch sources, not built artifacts, and
pnpm refuses to run a git dependency's build script until the user allowlists it — so
committing the bundles is what lets `dsh plugin add github:…` work with no build permission
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

## Layout of the seam

A dynamic Cordis package gets `styles.insert(css)` and `host.call(method)` from its
evaluator. An installed package gets neither, so:

- **Styles** go in as a tagged `<style>` element owned by the registering fiber
  (`insertSheet`), the way the shipped client plugins do it.
- **Browser → Node** goes over the Connection Fetch bridge:
  `ctx.connection.fetch.register({ path: '/api/omaseek.…', … })` on the Node half, an
  ordinary same-origin `fetch()` in the browser half. The themes plugin serves
  `/api/omaseek.themes`; the music plugin serves `/api/omaseek.music.meta` and
  `/api/omaseek.music.chunk`; the hero needs no Node half at all. The carrier authenticates and fences
  `/api/*` before the plugin sees the request, so the plugin adds no auth of its own. Routes
  must live under `/api/` with segments matching `^[A-Za-z0-9_$.-]+$`.

A host with no browser surface (headless, TUI) has no `connection` service; both registrars
return early rather than failing, so the package loads into any composition.

## Releasing

```
pnpm -r publish --access public     # or: pnpm publish:all
```

Three packages, three names, one command: `omaseek-themes`, `omaseek-pixel` and
`omaseek-music`. `prepack` rebuilds each bundle first. For a git-based release, tag the
commit (`git tag v0.1.0 && git push --tags`) so users can pin a folder:
`dsh plugin --profile web add "github:claudejaune/OmaSeek#v0.1.0&path:/packages/omaseek-pixel"`.

## Verifying the theme table

```
node tools/extract-theme-table.mjs
```

Parses the same tables independently and rewrites `tools/themes.generated.js`, a flat
snapshot of all 22 × 14 source colors. Commit it after editing `themes.md` so a palette
change shows up as a reviewable diff; no runtime code imports it — the Node half parses
`themes.md` directly, so the doc stays the only place a hex value is written.

## How the theming works

`theme.register({ id, colorScheme, tokens })` is the whole API surface here, and it is wider
than `Theme.listTokens` suggests. `ui-layout`'s theme presenter
(`packages/client/ui-layout/src/client/theme-presenter.ts`) writes **every key** of the
active theme onto `body` as an inline CSS variable and picks the base palette from
`colorScheme` — so a registered theme may set any `--dsw-*` token, not just the 13 the
inspect API advertises:

- **The 13 native tokens** (backgrounds, surfaces, borders, brand, text, state colors,
  sidebar fill) — the safe core, listed by `Theme.listTokens`.
- **16 design-platform tokens outside that set** — `--dsw-specific-bubble`,
  `--dsw-specific-input-major`, `--dsw-alias-label-tertiary`, `--dsw-alias-link`, the markdown
  code blocks, menus and sidebar nav states. These need no CSS injection: a registered
  theme's values are applied the same way as the native ones.

Because a registered theme declares exactly one scheme, its `tokens` are plain values. The
`{ light, dark }` pair form belongs to `overrideTokens()` layers only, and this plugin uses no
layer.

**Derived colors.** Each theme's 14 source values expand to 29 tokens; the extras are blends
of the source colors (`mix()` in the browser half). The user bubble is brand at 12.15 % over
the app background — the formula reproduces the blended column of `themes.md` §5.2 exactly
(Tokyo Night `#2a312e`), and sidebar hover/active states are stepped off the sidebar fill
itself so they stay visible on themes whose layers share one color.

### Two constraints worth knowing

**Corner radius is not themeable.** Radii are hard-coded per component (user bubble 22px,
composer card 22px, send button 999px) and there is no radius token in `design-platform.css`.
Squaring them off would require targeting build-hashed CSS-module class names, which change on
every rebuild. The plugin therefore squares only the controls it owns.

**The assistant reply is not a bubble.** `--dsw-specific-bubble` styles the user (and
steering) message only — `MessageItem.tsx`'s `UserStyleBubble` documents itself as
"right-aligned bubble shared by user and steering rows". The assistant renders through
`AssistantMarkdown`, which has no background declaration at all: it is plain text on
`--dsw-alias-bg-base`, so it follows the text/background tokens and needs no surface color.

**The shell does not persist a picked theme; the picker does.** `setTheme()` only writes the
built-in `light`/`dark`/`system` preference to settings. OmaSeek therefore remembers its own
choice per scheme in `localStorage` (`omaseek.themes`) and re-applies it on load.

## Credits

OmaSeek is MIT. It ports omarchy.org's front end — the hero pixel field, the headline
rotation, the music card — and collects Omarchy's 22 theme palettes, which is David
Heinemeier Hansson's work, MIT licensed. [CREDITS.md](CREDITS.md) lists what came from where.
The track omarchy.org plays is not included: OmaMusic plays a file of your own.

## Sources

Omarchy's own palette values come from the [Omarchy repo](https://github.com/omacom/omarchy)
(`themes/<id>/colors.toml`) and the home page's CSS bundle. Canonical palettes come from each
theme's official project — links for all of them are in the Sources section of `themes.md`.
The hero field and the now-playing card are ports of
`omarchy.org`'s `HeroPixelField.tsx` and its music card.
