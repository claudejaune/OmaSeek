# OmaSeek

Omarchy themes for DeepSeek Harness.

Two things live here:

1. **`themes.md`** — the research: the 22 themes Omarchy offers on its home page, every
   color from each one in tables, and how those colors map onto DeepSeek Harness theme
   tokens. This is the source of truth for the plugin's palettes.
2. **`plugins/`** — the Cordis plugin definitions that apply those palettes in the
   harness.

## Status

| Part | State |
|---|---|
| Research (`themes.md`) | Complete — 22 themes, canonical + Omarchy-retuned values, DSH token mapping |
| Plugin: single Tokyo Night toggle | Superseded by the full picker |
| Plugin: OmaSeek (themes + corners) | Implemented — `plugins/omaseek.host.js` + `plugins/omaseek.client.js` |
| Plugin: OmaPixel (New Session hero) | Implemented — `plugins/omapixel.client.js`, no Host half, switched in Settings → OmaPixel |
| Plugin: OmaMusic (floating player) | Implemented — `plugins/omamusic.host.js` + `plugins/omamusic.client.js` |

## The plugins

Three independent dynamic Cordis Plugins, each re-defined and re-run on its own while the
others keep running — OmaMusic untouched, OmaSeek for palettes and corners, OmaPixel for
the New Session hero. **OmaSeek** itself is two halves applied as one Package:

- **`plugins/omaseek.host.js`** — reads `themes.md` through the `fs` Service, parses the
  palette tables (§2, §4.1, §5.2, §7.2) and serves all 22 themes to the Client half over
  the Package-private `omaseek.themes` RPC. **The doc stays the only place a hex value is
  written**: change a color there and re-apply the Package.
- **`plugins/omaseek.client.js`** — registers every theme with `theme.register()` and
  contributes the **Settings → Omarchy** page: scheme chips, one card per theme with a
  live miniature of its palette, and the active one marked.

### Scheme-aware picker

Each theme is registered with the `colorScheme` Omarchy assigns it, so every theme is
half of a pair — a dark theme has no light variant. The picker therefore reads
`getTheme().active.colorScheme` and lists only the themes belonging to the scheme now in
force: the **5 light** palettes (`catppuccin-latte`, `flexoki-light`, `lupine`,
`rose-pine`, `white`) while the app is light, the **17 dark** ones while it is dark. The
Light / Dark / System chips switch the scheme — and with it, which set you can pick from.

The token pairs in `Theme.listTokens` are *not* this mechanism: a pair is one active
theme's own light and dark values, not two themes.

### OmaPixel — the hero pixel field

**`plugins/omapixel.client.js`** is the whole Plugin: hero phrase typewriter and the
field below, with no Host half at all — pure DOM and canvas, so it activates almost the
moment it is approved. The only seam to OmaSeek is the page itself: the field reads the
`--dsw-alias-*` tokens off `body` when it mounts and remounts on `theme/change`, so it
follows whichever OmaSeek palette is in force, and paints with the shipped theme (or its
own fallback inks) when OmaSeek is absent.

The New Session hero sits in the omarchy.org hero's field: a lattice of square cells whose
resting luminance comes from a drifting value-noise blob, dithered down to those cells with
the same 8×8 Bayer matrix the site uses, lit further by the cursor, and stamped by a press
with the Omarchy mark growing out of the click point and dissolving back through the dither.
Ported from `references/omarchy-site/src/components/HeroPixelField.tsx`.

Three pieces of the site's hero are deliberately left behind. The wordmark reveal is
`src/lib/etch.ts` — `ttfx`, a WASM terminal engine the site loads as `/ttfx/0.3.2/ttfx.js`
plus `effects/all.wasm` — and there is no Omarchy wordmark here to reveal; the same goes for
the music spectrum, whose audio graph lives in OmaMusic, and for the wandering sprite that
stamps the site's field while nobody is looking: this field answers the user and nothing
else.

**Where it is mounted.** There is no backdrop Slot on the hero — `conversation.hero.*` only
offers the brand mark, the workspace picker and the agent-preset control — so the canvas is
a `z-index:-1` child of the conversation root while that root is in its `hero` phase, found
through `[data-phase="hero"]`. A `z-index:-1` child paints above the panel's own background
and below everything the harness draws, and the host is given `isolation:isolate` because
without a stacking context of its own the negative cell lands behind that background
instead. No product element is restacked and no Slot is replaced; a `MutationObserver` on
`data-phase` remounts the field as the hero arrives with the route and leaves with the first
message.

**How big it is.** The cells fill a band, not the panel: the composer column
(`--dsw-composer-card-max-width`, centred on the composer seat) from three cells above the
headline to three below the input card. The radial ramp keeps the middle clear of pixels,
the same way the site keeps them off its wordmark, so the field reads as a frame around the
hero copy.

**Switching it.** Settings → OmaPixel has a **Pixel field** row: `Off` runs nothing, `Ambient`
is the drifting lattice alone, and `Interactive` adds the cursor glow and the press stamp. It is not
persisted, like every other OmaSeek preference — dynamic Packages do not survive the process.

### Verifying

```
node plugins/tools/extract-theme-table.mjs
```

Parses the same tables independently and rewrites `plugins/themes.generated.js`, a flat
snapshot of all 22 × 14 source colors. Commit it after editing `themes.md` so a palette
change shows up as a reviewable diff; the plugin does not import it.

## How the theming works

`theme.register({ id, colorScheme, tokens })` is the whole API surface here, and it is
wider than `Theme.listTokens` suggests. `ui-layout`'s theme presenter
(`packages/client/ui-layout/src/client/theme-presenter.ts`) writes **every key** of the
active theme onto `body` as an inline CSS variable and picks the base palette from
`colorScheme` — so a registered theme may set any `--dsw-*` token, not just the 13 the
inspect API advertises:

- **The 13 native tokens** (backgrounds, surfaces, borders, brand, text, state colors,
  sidebar fill) — the safe core, listed by `Theme.listTokens`.
- **16 design-platform tokens outside that set** — `--dsw-specific-bubble`,
  `--dsw-specific-input-major`, `--dsw-alias-label-tertiary`, `--dsw-alias-link`, the
  markdown code blocks, menus and sidebar nav states. These need no CSS injection: a
  registered theme's values are applied the same way as the native ones.

Because a registered theme declares exactly one scheme, its `tokens` are plain values.
The `{ light, dark }` pair form belongs to `overrideTokens()` layers only, and this plugin
uses no layer.

**Derived colors.** Each theme's 14 source values expand to 29 tokens; the extras are
blends of the source colors (`mix()` in the Client half). The user bubble is brand at
12.15 % over the app background — the formula reproduces the blended column of `themes.md`
§5.2 exactly (Tokyo Night `#2a312e`), and sidebar hover/active states are stepped off the
sidebar fill itself so they stay visible on themes whose layers share one color.

### Two constraints worth knowing

**Corner radius is not themeable.** Radii are hard-coded per component (user bubble 22px,
composer card 22px, send button 999px) and there is no radius token in
`design-platform.css`. Squaring them off would require targeting build-hashed CSS-module
class names, which change on every rebuild. The plugin therefore squares only the
controls it owns.

**The assistant reply is not a bubble.** `--dsw-specific-bubble` styles the user (and
steering) message only — `MessageItem.tsx`'s `UserStyleBubble` documents itself as
"right-aligned bubble shared by user and steering rows". The assistant renders through
`AssistantMarkdown`, which has no background declaration at all: it is plain text on
`--dsw-alias-bg-base`, so it follows the text/background tokens and needs no surface
color.

**A picked theme is not persisted.** `setTheme()` only writes the built-in
`light`/`dark`/`system` preference to settings, so an Omarchy theme is lost on reload —
as is the registration itself, since dynamic Packages do not survive the process.


## Sources

Omarchy's own palette values come from the [Omarchy repo](https://github.com/omacom/omarchy)
(`themes/<id>/colors.toml`) and the home page's CSS bundle. Canonical palettes come from
each theme's official project — links for all of them are in the Sources section of
`themes.md`.
