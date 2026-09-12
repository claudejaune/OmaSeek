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
| Plugin: single Tokyo Night toggle | Running (`tokyon-1`) |
| Plugin: full 22-theme picker | In progress |

## Themes

The 22 home-page themes, split by the color scheme Omarchy assigns them:

**Dark (17)** — Tokyo Night, Catppuccin, Gruvbox, Matte Black, Ethereal, Everforest,
Hackerman, Kanagawa, Last Horizon, Lumon, Miasma, Nord, Osaka Jade, Retro 82,
Ristretto, Solitude, Vantablack

**Light (5)** — Catppuccin Latte, Flexoki Light, Lupine, Rosé Pine, White

Every theme ships only one half of the pair (a dark theme has no light variant), so the
plugin keeps themes of the non-active scheme out of the picker rather than rendering a
dark palette over a light UI.

## How the theming works

DeepSeek Harness exposes two distinct surfaces, which the plugin uses accordingly:

- **13 native theme tokens** via `theme.overrideTokens(source, tokens)`, each supplied as
  a `{ light, dark }` pair. The active color scheme selects which value is used — this is
  the sanctioned API and covers backgrounds, surfaces, borders, brand, text and state
  colors, plus the sidebar.
- **A handful of tokens outside that set** (`--dsw-specific-bubble`,
  `--dsw-specific-input-major`, `--dsw-alias-label-tertiary`), applied as plain CSS.

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

## Sources

Omarchy's own palette values come from the [Omarchy repo](https://github.com/omacom/omarchy)
(`themes/<id>/colors.toml`) and the home page's CSS bundle. Canonical palettes come from
each theme's official project — links for all of them are in the Sources section of
`themes.md`.
