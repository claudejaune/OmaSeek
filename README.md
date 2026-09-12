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
| Plugin: full 22-theme picker | Implemented — `plugins/omaseek.host.js` + `plugins/omaseek.client.js` |

## The plugin

Two halves, applied as one dynamic Cordis Package:

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
