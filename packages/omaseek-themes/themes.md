# Omarchy home-page themes → DeepSeek Harness: color research

> Research only — this document maps *colors*, it does not implement anything. It is the input for a future DSH "themes" plugin.

**Date:** fetched live on the day of research. **Sources:** [omarchy.org](https://omarchy.org) home page + its CSS bundle, the [Omarchy](https://github.com/omacom/omarchy) repo (`quattro` branch, `themes/<id>/colors.toml`), official theme palettes, the opencode CLI theme format, and the DeepSeek Harness source (theme service + design-platform tokens). All URLs are listed in [§8](#8-sources).

## 1. Scope & method

1. Fetched `https://omarchy.org`, its HTML, and its generated CSS bundle (`/_astro/page-seo.DcPwmISg.css`). Parsed every `[data-theme=…] { … }` block — that is exactly the theme set the home-page picker offers.
2. Confirmed the picker list from the page inline script: 22 themes (`ok=[…]`), 17 dark and 5 light (`dark=[…]`, `light=[…]`).
3. For the well-known palettes (tokyo-night, gruvbox, catppuccin, nord, kanagawa, everforest, rose-pine, flexoki) pulled the canonical hex values from official pages/repos.
4. Wrote down how a chat-CLI maps these palettes to semantic UI roles, using the opencode CLI theme format (`defs` → `primary/accent/text/background/border/…`) as the reference model.
5. Inspected the DeepSeek Harness theming surface in the running harness: `Theme.listTokens` (13 overridable tokens), the `theme` Client Service (`register` / `overrideTokens` / `setTheme`), the design-platform token stylesheet (`design-platform.css`, 90 alias/specific tokens, light + dark blocks), and the actual chat CSS that colors the **user** bubble, assistant reply text, the input bar and the sidebar.
6. Produced: (a) all colors in tables, (b) a UI-part → color table per theme, (c) a mapping table from Omarchy variables to DSH tokens.

## 2. The 22 themes on the Omarchy home page

These are the only themes asked for: the ones Omarchy offers on its **home page**, not the community list at `/themes/`. The picker order is preserved below.

| # | id (`data-theme`) | Display name | color-scheme | Brand `--t-brand` | Provenance |
|---|---|---|---|---|---|
| 1 | `tokyo-night` | Tokyo Night | `dark` | `#9ece6a` | Canonical open palette — Tokyonight (VS Code by enkia; nvim port folke) |
| 2 | `white` | White | `light` | `#6e6e6e` | omarchy-original (simple light default) |
| 3 | `catppuccin` | Catppuccin | `dark` | `#89b4fa` | Canonical open palette — Catppuccin Mocha (catppuccin.com) |
| 4 | `gruvbox` | Gruvbox | `dark` | `#7daea3` | Canonical open palette — Gruvbox dark (morhetz/gruvbox) |
| 5 | `matte-black` | Matte Black | `dark` | `#e68e0d` | Public standalone scheme — matte-black (tahayvr) |
| 6 | `rose-pine` | Rosé Pine | `light` | `#56949f` | Canonical open palette — Rosé Pine Dawn/light (rosepinetheme.com) |
| 7 | `catppuccin-latte` | Catppuccin Latte | `light` | `#1e66f5` | Canonical open palette — Catppuccin Latte (catppuccin.com) |
| 8 | `ethereal` | Ethereal | `dark` | `#7d82d9` | omarchy-original (built on omacom/aether.nvim) |
| 9 | `everforest` | Everforest | `dark` | `#7fbbb3` | Canonical open palette — Everforest dark (sainnhe/everforest) |
| 10 | `flexoki-light` | Flexoki Light | `light` | `#205ea6` | Canonical open palette — Flexoki light (stephango.com/flexoki) |
| 11 | `hackerman` | Hackerman | `dark` | `#82fb9c` | Public standalone scheme — hackerman (bjarneo/hackerman.nvim) |
| 12 | `kanagawa` | Kanagawa | `dark` | `#dcd7ba` | Canonical open palette — Kanagawa wave (rebelot/kanagawa.nvim) |
| 13 | `last-horizon` | Last Horizon | `dark` | `#b59790` | omarchy-original (HANCORE community theme) |
| 14 | `lumon` | Lumon | `dark` | `#8bc9eb` | omarchy-original (Severance-inspired cold navy; own palette) |
| 15 | `lupine` | Lupine | `light` | `#3264eb` | omarchy-original (light cool-blue) |
| 16 | `miasma` | Miasma | `dark` | `#78824b` | Public standalone scheme — miasma (xero/miasma.nvim, "inspired by the woods") |
| 17 | `nord` | Nord | `dark` | `#81a1c1` | Canonical open palette — Nord (nordtheme.com) |
| 18 | `osaka-jade` | Osaka Jade | `dark` | `#509475` | omarchy-original (born in the Omarchy/omakub family) |
| 19 | `retro-82` | Retro 82 | `dark` | `#faa968` | omarchy-original (retro terminal look) |
| 20 | `ristretto` | Ristretto | `dark` | `#f38d70` | Public scheme — Monokai Pro filter "Ristretto" (monokai.pro) |
| 21 | `solitude` | Solitude | `dark` | `#798186` | omarchy-original (quiet neutral) |
| 22 | `vantablack` | Vantablack | `dark` | `#8d8d8d` | Public standalone scheme — vantablack (bjarneo/vantablack.nvim) |

- **Dark (17):** `tokyo-night`, `catppuccin`, `gruvbox`, `matte-black`, `ethereal`, `everforest`, `hackerman`, `kanagawa`, `last-horizon`, `lumon`, `miasma`, `nord`, `osaka-jade`, `retro-82`, `ristretto`, `solitude`, `vantablack`.
- **Light (5):** `catppuccin-latte`, `flexoki-light`, `lupine`, `rose-pine`, `white`.

Note: Omarchy *retunes* each palette for its own site (e.g. gruvbox text is `#d4be98` instead of the canonical `#ebdbb2`; tokyo-night brand is green `#9ece6a` instead of the blue). For a faithful "Omarchy look", port the site values; for a canonical look, port the official palette values in §4.2.

## 3. What each Omarchy home-page CSS variable means

| Omarchy variable | What it colors in the Omarchy UI | Canonical palette role |
|---|---|---|
| `--t-bg-deep` | Darkest app canvas (behind everything, e.g. hero/canvas area) | mantle / bg-hard |
| `--t-bg` | Main app background | base / bg |
| `--t-surface` | Raised surface: cards, panels | surface / bg1 |
| `--t-surface-2` | Elevated/nested surface, hover fills | surface-2 / bg2 |
| `--t-border-subtle` | Quiet borders between surfaces | bg2 / border-subtle |
| `--t-border-strong` | Stronger borders, separators, input outlines | border-strong |
| `--t-text` | Primary text | fg / text |
| `--t-text-secondary` | Secondary text | secondary-fg |
| `--t-text-muted` | Muted/caption text, placeholders | muted / comment |
| `--t-brand` | Brand/accent: primary buttons, links, highlights | accent |
| `--t-brand-soft` | Soft tinted background for brand accents (12% alpha of brand) | accent-soft |
| `--t-brand-ink` | Ink color for text rendered *on* the brand color | on-accent |
| `--t-selection` | Text-selection highlight | selection |
| `--t-field-bg` | Text-input field background | field-bg |
| `--t-field-dim` | Field gradient (darkest stop) | field-low |
| `--t-field-mid` | Field gradient mid stop | field-mid |
| `--t-field-lit` | Field gradient highlight stop (accent) | field-accent |
| `--t-field-hover` | Field hover tone | field-hover |
| `--t-field-crest` | Field gradient lightest stop | field-high |
| `--t-hdr-text` | Header/topbar primary text | hdr-text |
| `--t-hdr-text-2` | Header secondary text | hdr-text-2 |
| `--t-hdr-brand` | Header brand/accent | hdr-accent |
| `--t-hdr-ink` | Ink for text on the header brand | hdr-on-accent |
| `--t-hdr-surface` | Header/topbar background | hdr-bg |
| `--t-hdr-surface-2` | Header elevated surface | hdr-bg-2 |

`--t-brand-soft` is always `--t-brand` at **12 % alpha** (8-digit hex `…1f`), and `--t-elevation` / `--t-elevation-hover` are shadows that can stay on the DSH side.

## 4. All the colors, in tables

### 4.1 UI part × theme — colors as Omarchy ships them on the home page

Every cell is the exact value of the Omarchy CSS variable named in the second column (values for the *site*, which are the tuned variants). `sand`-colored `…1f` cells are 12 % alpha tints.

| UI part | token | Tokyo Night | White | Catppuccin | Gruvbox | Matte Black | Rosé Pine | Catppuccin Latte | Ethereal | Everforest | Flexoki Light | Hackerman | Kanagawa | Last Horizon | Lumon | Lupine | Miasma | Nord | Osaka Jade | Retro 82 | Ristretto | Solitude | Vantablack |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| App background | `--t-bg` | `#1a1b26` | `#fff` | `#1e1e2e` | `#282828` | `#121212` | `#faf4ed` | `#eff1f5` | `#060b1e` | `#2d353b` | `#fffcf0` | `#0b0c16` | `#1f1f28` | `#0c0b0c` | `#16242d` | `#fafafa` | `#222` | `#2e3440` | `#111c18` | `#05182e` | `#2c2525` | `#101315` | `#000` |
| Deep canvas (behind everything) | `--t-bg-deep` | `#13141c` | `#f5f5f5` | `#161622` | `#1e1e1e` | `#0d0d0d` | `#ede7e1` | `#e3e4e8` | `#040816` | `#21272c` | `#f2efe4` | `#080910` | `#17171e` | `#090809` | `#101b21` | `#ececec` | `#191919` | `#222730` | `#0c1512` | `#031222` | `#211b1b` | `#0c0e10` | `#090909` |
| Sidebar / header surface | `--t-hdr-surface` | `#2d3044` | `#000` | `#383852` | `#484645` | `#212121` | `#000` | `#000` | `#10183c` | `#485760` | `#000` | `#16182b` | `#323a4e` | `#121112` | `#243a4c` | `#000` | `#393939` | `#4e576c` | `#23382e` | `#0a2a4e` | `#4c3e3c` | `#181d20` | `#141414` |
| Header text | `--t-hdr-text` | `#ced8ff` | `#e8e8e8` | `#dde6ff` | `#ead4ae` | `#f3f3f3` | `#8a895c` | `#8b8973` | `#ffd4bd` | `#ebe3ca` | `#d5d3c9` | `#e3fdff` | `#ede8d0` | `#fff` | `#fdffff` | `#dedede` | `#d4d4c2` | `#f1faff` | `#fff7bf` | `#f8e8c3` | `#feedef` | `#d2d6d7` | `#fff` |
| Cards / raised surfaces | `--t-surface` | `#1f2230` | `#fff` | `#282839` | `#32302f` | `#181818` | `#fffaf3` | `#f8f9fb` | `#0c122c` | `#303a40` | `#f9f6ea` | `#10121f` | `#202838` | `#0c0b0c` | `#182836` | `#fff` | `#272727` | `#343b49` | `#1a2a22` | `#081e37` | `#342a28` | `#101315` | `#0d0d0d` |
| Nested surface / hover | `--t-surface-2` | `#24283b` | `#f5f5f5` | `#313244` | `#3c3836` | `#1e1e1e` | `#ede7e1` | `#e3e4e8` | `#131a3a` | `#343f44` | `#f2efe4` | `#151828` | `#223249` | `#0c0b0c` | `#1b2d40` | `#ececec` | `#2c2c2c` | `#3b4252` | `#23372b` | `#0a2540` | `#3d2f2a` | `#101315` | `#1a1a1a` |
| Text-input field bg | `--t-field-bg` | `#0e0e14` | `#e8e8e8` | `#101019` | `#161616` | `#090909` | `#e1dbd5` | `#d7d8dc` | `#030610` | `#181d20` | `#e5e2d8` | `#06060c` | `#111116` | `#060606` | `#0b1216` | `#dedede` | `#121212` | `#191c23` | `#090f0d` | `#020c17` | `#181414` | `#080a0b` | `#070707` |
| Input accent band | `--t-field-lit` | `#9ece6a` | `#6e6e6e` | `#89b4fa` | `#7daea3` | `#e68e0d` | `#56949f` | `#1e66f5` | `#7d82d9` | `#7fbbb3` | `#205ea6` | `#82fb9c` | `#dcd7ba` | `#b59790` | `#8bc9eb` | `#3264eb` | `#78824b` | `#81a1c1` | `#509475` | `#faa968` | `#f38d70` | `#798186` | `#8d8d8d` |
| Primary button / brand | `--t-brand` | `#9ece6a` | `#6e6e6e` | `#89b4fa` | `#7daea3` | `#e68e0d` | `#56949f` | `#1e66f5` | `#7d82d9` | `#7fbbb3` | `#205ea6` | `#82fb9c` | `#dcd7ba` | `#b59790` | `#8bc9eb` | `#3264eb` | `#78824b` | `#81a1c1` | `#509475` | `#faa968` | `#f38d70` | `#798186` | `#8d8d8d` |
| On-brand text | `--t-brand-ink` | `#0c0e10` | `#fff` | `#0c0e10` | `#0c0e10` | `#0c0e10` | `#fff` | `#fff` | `#0c0e10` | `#0c0e10` | `#fff` | `#0c0e10` | `#0c0e10` | `#0c0e10` | `#0c0e10` | `#fff` | `#0c0e10` | `#0c0e10` | `#0c0e10` | `#0c0e10` | `#0c0e10` | `#0c0e10` | `#0c0e10` |
| User bubble bg (tint) | `--t-brand-soft` | `#9ece6a1f` | `#6e6e6e1f` | `#89b4fa1f` | `#7daea31f` | `#e68e0d1f` | `#56949f1f` | `#1e66f51f` | `#7d82d91f` | `#7fbbb31f` | `#205ea61f` | `#82fb9c1f` | `#dcd7ba1f` | `#b597901f` | `#8bc9eb1f` | `#3264eb1f` | `#78824b1f` | `#81a1c11f` | `#5094751f` | `#faa9681f` | `#f38d701f` | `#7981861f` | `#8d8d8d1f` |
| User & bot text | `--t-text` | `#c0caf5` | `#000` | `#cdd6f4` | `#d4be98` | `#eaeaea` | `#575279` | `#4c4f69` | `#ffcead` | `#d3c6aa` | `#100f0f` | `#ddf7ff` | `#dcd7ba` | `#fafcfb` | `#f2fcff` | `#000` | `#c2c2b0` | `#d8dee9` | `#f7e8b2` | `#f6dcac` | `#e6d9db` | `#cacccc` | `#fff` |
| Secondary text | `--t-text-secondary` | `#a9b1d6` | `#383838` | `#cdd6f4` | `#d4be98` | `#bebebe` | `#5e587d` | `#53556f` | `#ffcead` | `#d3c6aa` | `#454340` | `#ddf7ff` | `#dcd7ba` | `#e2dddc` | `#d6e2ee` | `#212121` | `#c2c2b0` | `#d8dee9` | `#c1c497` | `#f6dcac` | `#e6d9db` | `#a5aeb4` | `#fff` |
| Muted text | `--t-text-muted` | `#8b93b8` | `#4a4a4a` | `#9399b2` | `#a89984` | `#8a8a8a` | `#676284` | `#5c5f77` | `#b6a6b2` | `#918f84` | `#555450` | `#a4b2ca` | `#a7a492` | `#a9a5a6` | `#a0c1d8` | `#484848` | `#8c8c82` | `#9fa7b4` | `#969978` | `#9ab69b` | `#aca1a2` | `#8a8d90` | `#a8a8a8` |
| Subtle border | `--t-border-subtle` | `#24283b` | `#e8e8e8` | `#313244` | `#3c3836` | `#1e1e1e` | `#e1dbd5` | `#d7d8dc` | `#131a3a` | `#343f44` | `#e5e2d8` | `#151828` | `#223249` | `#0c0b0c` | `#1b2d40` | `#dedede` | `#2c2c2c` | `#3b4252` | `#23372b` | `#0a2540` | `#3d2f2a` | `#101315` | `#1a1a1a` |
| Strong border | `--t-border-strong` | `#414868` | `silver` | `#585b70` | `#665c54` | `#333` | `#cecacd` | `#acb0be` | `#6d7db6` | `#475258` | `#b7b5ac` | `#2d3450` | `#54546d` | `#584e51` | `#304860` | `#9e9e9e` | `#666` | `#4c566a` | `#53685b` | `#2a6b78` | `#72696a` | `#4b4e55` | `#7a7a7a` |
| Selection highlight | `--t-selection` | `#292e42` | `silver` | `#45475a` | `#504945` | `#2a2a2a` | `#dfdad9` | `#ccd0da` | `#252e56` | `#3d484d` | `#cecdc3` | `#1f253a` | `#363646` | `#584e51` | `#243d56` | `#d0d0d0` | `#383838` | `#434c5e` | `#32473b` | `#134e5a` | `#403e41` | `#343d41` | `#1a1a1a` |

### 4.2 Canonical palettes (official sources) for the nine well-known themes

These are the values from each theme’s *official* page/repo, before Omarchy’s retuning. They are the reference for the state colors (error/success/warning), accents and text of the mapping in §7.

**Tokyo Night (Night, dark)** — source: [enkia/tokyo-night-vscode-theme](https://github.com/enkia/tokyo-night-vscode-theme) + [folke/tokyonight.nvim](https://github.com/folke/tokyonight.nvim) port

| Role | Hex | Official name |
|---|---|---|
| bg | `#1a1b26` | Editor background (Night) |
| bg dark | `#16161e` | bg_dark |
| bg deepest | `#0c0e14` | bg_dark1 |
| fg | `#c0caf5` | Terminal White / variables |
| fg dark | `#a9b1d6` | Editor foreground |
| muted/comment | `#565f89` | Comments |
| selection | `#515c7e at ≈28 %` | selection background |
| red | `#f7768e` | keyword / HTML |
| orange | `#ff9e64` | numbers / constants |
| yellow | `#e0af68` | parameters |
| green | `#9ece6a` | strings |
| teal/cyan | `#73daca / #7dcfff` | object keys / Markdown links / terminal cyan |
| blue | `#7aa2f7` | functions |
| purple / magenta | `#9d7cd8 / #bb9af7` | preproc / control keywords |
| **accent** | `**#3d59a1**` | blue0 — buttons/badges/focus in the official VS Code theme |
---

**Tokyo Night (light variant)** — source: same sources

| Role | Hex | Official name |
|---|---|---|
| bg | `#e6e7ed` |  |
| fg | `#343b58` |  |
| comment/muted | `#6c6e75 / #40434f` |  |
| red/orange/yellow | `#8c4351 / #965027 / #8f5e15` |  |
| green/teal/cyan | `#385f0d / #33635c / #0f4b6e` |  |
| blue/magenta | `#2959aa / #5a3e8e` |  |
---

**Gruvbox (dark, medium)** — source: [morhetz/gruvbox](https://github.com/morhetz/gruvbox) `colors/gruvbox.vim`

| Role | Hex | Official name |
|---|---|---|
| bg0 (hard / soft) | `#282828 (#1d2021 / #32302f)` | dark0 default/medium |
| bg1 / bg2 / bg3 | `#3c3836 / #504945 / #665c54` | dark1 / dark2 / dark3 (bg3 = selection) |
| fg1 (default fg) | `#ebdbb2` | light1 |
| fg0 / fg2 / fg3 / fg4 | `#fbf1c7 / #d5c4a1 / #bdae93 / #a89984` | light0..light4 |
| comment | `#928374` | gray_245 |
| red / green / yellow | `#fb4934 / #b8bb26 / #fabd2f` | bright red/green/yellow |
| blue / purple / aqua | `#83a598 / #d3869b / #8ec07c` | bright blue/purple/aqua |
| orange | `#fe8019` | bright orange |
| **accent (UI ports)** | `**#fe8019**` | orange; links use blue #83a598, search cursor highlights orange |
---

**Gruvbox (light variant)** — source: same source

| Role | Hex | Official name |
|---|---|---|
| bg0 / fg | `#fbf1c7 / #282828` | light0 / dark0 |
| faded accents | `red #9d0006 · green #79740e · yellow #b57614 · blue #076678 · purple #8f3f71 · aqua #427b58 · orange #af3a03` |  |
---

**Catppuccin Mocha (dark)** — source: [catppuccin.com/palette](https://catppuccin.com/palette/) + [catppuccin/palette](https://github.com/catppuccin/palette) v1.8.0

| Role | Hex | Official name |
|---|---|---|
| base / mantle / crust | `#1e1e2e / #181825 / #11111b` |  |
| surface0 / surface1 / surface2 | `#313244 / #45475a / #585b70` |  |
| overlay0 / overlay1 / overlay2 | `#6c7086 / #7f849c / #9399b2` | selection ≈ overlay2 @ 20-30 % |
| text / subtext1 / subtext0 | `#cdd6f4 / #bac2de / #a6adc8` |  |
| rosewater / flamingo | `#f5e0dc / #f2cdcd` |  |
| pink / mauve | `#f5c2e7 / #cba6f7` | mauve = de-facto brand color |
| red / maroon | `#f38ba8 / #eba0ac` |  |
| peach / yellow | `#fab387 / #f9e2af` |  |
| green / teal | `#a6e3a1 / #94e2d5` |  |
| sky / sapphire / blue | `#89dceb / #74c7ec / #89b4fa` | links use blue |
| lavender | `#b4befe` |  |
| **accent** | `**#89b4fa (links) / #cba6f7 (brand)**` | style guide: blue for links/tags; mauve for brand |
---

**Catppuccin Latte (light)** — source: same sources

| Role | Hex | Official name |
|---|---|---|
| base / mantle / crust | `#eff1f5 / #e6e9ef / #dce0e8` |  |
| surface0 / 1 / 2 | `#ccd0da / #bcc0cc / #acb0be` |  |
| overlay0 / 1 / 2 | `#9ca0b0 / #8c8fa1 / #7c7f93` |  |
| text / subtext | `#4c4f69 / #5c5f77 / #6c6f85` |  |
| rosewater / flamingo | `#dc8a78 / #dd7878` |  |
| pink / mauve | `#ea76cb / #8839ef` |  |
| red / maroon | `#d20f39 / #e64553` |  |
| peach / yellow | `#fe640b / #df8e1d` |  |
| green / teal | `#40a02b / #179299` |  |
| sky / sapphire / blue | `#04a5e5 / #209fb5 / #1e66f5` |  |
| lavender | `#7287fd` |  |
| **accent** | `**#1e66f5 (links) / #8839ef (brand)**` |  |
---

**Nord** — source: [nordtheme.com/docs/colors-and-palettes](https://www.nordtheme.com/docs/colors-and-palettes)

| Role | Hex | Official name |
|---|---|---|
| bg nord0 / nord1 / nord2 | `#2e3440 / #3b4252 / #434c5e` | nord2 = selection |
| muted nord3 | `#4c566a` | comments |
| fg nord4 / nord5 / nord6 | `#d8dee9 / #e5e9f0 / #eceff4` |  |
| frost nord7-10 | `#8fbcbb / #88c0d0 / #81a1c1 / #5e81ac` |  |
| red nord11 / orange nord12 | `#bf616a / #d08770` |  |
| yellow nord13 / green nord14 / purple nord15 | `#ebcb8b / #a3be8c / #b48ead` |  |
| **accent** | `**#88c0d0 (nord8)**` | official primary accent |
---

**Kanagawa (wave, dark)** — source: [rebelot/kanagawa.nvim](https://github.com/rebelot/kanagawa.nvim)

| Role | Hex | Official name |
|---|---|---|
| bg sumiInk0-3 | `#16161d / #1f1f28 / #2a2a37 / #363646` | default bg = sumiInk1 |
| fg fujiWhite / oldWhite | `#dcd7ba / #c8c093` |  |
| comment fujiGray | `#727169` |  |
| selection waveBlue1 / waveBlue2 | `#223249 / #2d4f67` | visual selection / search |
| red waveRed / samuraiRed | `#e46876 / #e82424` |  |
| orange surimiOrange / peachRed | `#ffa066 / #ff5d62` |  |
| yellow carpYellow / roninYellow | `#e6c384 / #ff9e3b` |  |
| green springGreen / autumnGreen | `#98bb6c / #76946a` |  |
| aqua waveAqua1 / waveAqua2 | `#6a9589 / #7aa89f` |  |
| blue crystalBlue / springBlue | `#7e9cd8 / #7fb4ca` |  |
| purple oniViolet / springViolet2 | `#957fb8 / #9cabca` |  |
| pink sakuraPink | `#d27e99` | numbers |
| **accent** | `**#7e9cd8 (crystalBlue)**` | functions/titles — go-to accent in ports |
---

**Everforest (dark, medium)** — source: [sainnhe/everforest](https://github.com/sainnhe/everforest) `palette.md`

| Role | Hex | Official name |
|---|---|---|
| bg dim / bg0 / bg1 | `#232a2e / #2d353b / #343f44` |  |
| bg2 / bg3 / bg4 | `#3d484d / #475258 / #4f585e` |  |
| fg | `#d3c6aa` |  |
| selection | `#543a48` | bg_visual |
| red / orange | `#e67e80 / #e69875` |  |
| yellow / green | `#dbbc7f / #a7c080` |  |
| aqua / blue / purple | `#83c092 / #7fbbb3 / #d699b6` |  |
| muted grey0/grey1/grey2 | `#7a8478 / #859289 / #9da9a0` |  |
| **accent** | `**#a7c080 (green)**` | statusline1 / search / hints |
---

**Everforest (light accents)** — source: same source

| Role | Hex | Official name |
|---|---|---|
| fg | `#5c6a72` |  |
| red/orange/yellow | `#f85552 / #f57d26 / #dfa000` |  |
| green/aqua/blue/purple | `#8da101 / #35a77c / #3a94c5 / #df69ba` |  |
---

**Rosé Pine (main = dark; Dawn = light)** — source: [rosepinetheme.com/palette](https://rosepinetheme.com/palette) + [rose-pine/rose-pine-palette](https://github.com/rose-pine/rose-pine-palette)

| Role | Hex | Official name |
|---|---|---|
| base (main / dawn) | `#191724 / #faf4ed` | the Omarchy picker uses the *light* variant |
| surface | `#1f1d2e / #fffaf3` |  |
| overlay | `#26233a / #f2e9e1` |  |
| muted | `#6e6a86 / #9893a5` |  |
| subtle | `#908caa / #797593` |  |
| text | `#e0def4 / #575279` |  |
| love (error-ish) | `#eb6f92 / #b4637a` |  |
| gold | `#f6c177 / #ea9d34` |  |
| rose | `#ebbcba / #d7827e` |  |
| pine | `#31748f / #286983` | functions |
| foam | `#9ccfd8 / #56949f` | info |
| **accent = iris** | `**#c4a7e7 / #907aa9**` | links, parameters, hints |
| selection highlightMed | `#403d52 / #dfdad9` |  |
---

**Flexoki** — source: [stephango.com/flexoki](https://stephango.com/flexoki) + [kepano/flexoki](https://github.com/kepano/flexoki)

| Role | Hex | Official name |
|---|---|---|
| bg (light / dark) | `#fffcf0 (paper) / #100f0f (black)` |  |
| bg-2 | `#f2f0e5 / #1c1b1a` | base-50 / base-950 |
| ui | `#e6e4d9 / #282726` | base-100 / base-900 |
| ui-2 | `#dad8ce / #343331` | base-150 / base-850 |
| ui-3 | `#cecdc3 / #403e3c` | base-200 / base-800 |
| tx-3 | `#b7b5ac / #575653` | base-300 / base-700 |
| tx-2 | `#6f6e69 / #878580` | base-600 / base-500 |
| tx | `#100f0f / #cecdc3` | black / base-200 |
| red | `#d14d41 (400) / #af3029 (600)` | light uses 600, dark uses 400 |
| orange | `#da702c / #bc5215` |  |
| yellow | `#d0a215 / #ad8301` |  |
| green | `#879a39 / #66800b` |  |
| cyan | `#3aa99f / #24837b` |  |
| blue | `#4385be / #205ea6` |  |
| purple | `#8b7ec8 / #5e409d` |  |
| magenta | `#ce5d97 / #a02f6f` |  |
| **accent/link = cyan** | `**#3aa99f (dark) / #24837b (light)**` | official mapping table: cy → Links, active states |
---

### 4.3 The other thirteen themes — where their colors come from

These have no canonical public palette (or are Omarchy-only ports); their canonical values are the ones Omarchy itself ships. The table below is parsed from the Omarchy repo (`omacom/omarchy`, `quattro` branch, `themes/<id>/colors.toml`) — **the same source the home-page picker renders.** It gives each theme its semantic `accent`, `selection`, `muted`, surfaces and the ANSI 8 used for terminals (red/yellow/green/cyan/blue/magenta/orange/brown) — the natural source for DSH error/success/warning state colors.

| id | Origin | mode | accent | selection | muted | background | foreground | ANSI 8 (red·yellow·green·cyan·blue·magenta·orange) |
|---|---|---|---|---|---|---|---|---|
| `matte-black` | Public standalone scheme — [tahayvr/matte-black-theme](https://github.com/tahayvr/matte-black-theme) (official Omarchy theme with nvim/vscode/zed ports) | `dark` | `#e68e0d` | `#2a2a2a` | `#333333` | `#121212` | `#bebebe` | `#D35F5F · #b91c1c · #FFC107 · #bebebe · #e68e0d · #D35F5F · #c63d3d` |
| `vantablack` | Public — [bjarneo/vantablack.nvim](https://github.com/bjarneo/vantablack.nvim); Omarchy itself uses pure `#000000` | `dark` | `#8d8d8d` | `#1a1a1a` | `#7a7a7a` | `#000000` | `#ffffff` | `#a4a4a4 · #cecece · #b6b6b6 · #b0b0b0 · #8d8d8d · #9b9b9b · #b9b9b9` |
| `hackerman` | Public — [bjarneo/hackerman.nvim](https://github.com/bjarneo/hackerman.nvim) ("aether" variant made for Omarchy) | `dark` | `#82FB9C` | `#1f253a` | `#2d3450` | `#0B0C16` | `#ddf7ff` | `#50f872 · #50f7d4 · #4fe88f · #7cf8f7 · #829dd4 · #86a7df · #50f7a3` |
| `miasma` | Public — [xero/miasma.nvim](https://github.com/xero/miasma.nvim) ("inspired by the woods"); Omarchy port retunes fg to `#c2c2b0` | `dark` | `#78824b` | `#383838` | `#666666` | `#222222` | `#c2c2b0` | `#685742 · #b36d43 · #5f875f · #c9a554 · #78824b · #bb7744 · #8d6242` |
| `ristretto` | Public — Monokai Pro filter "Ristretto" ([monokai/monokai-pro-vscode](https://github.com/monokai/monokai-pro-vscode)) | `dark` | `#f38d70` | `#403e41` | `#72696a` | `#2c2525` | `#e6d9db` | `#fd6883 · #f9cc6c · #adda78 · #85dacc · #f38d70 · #a8a9eb · #fb9a77` |
| `last-horizon` | Omarchy-original ([HANCORE community theme](https://github.com/HANCORE-linux/omarchy-lasthorizon-theme)) | `dark` | `#b59790` | `#584e51` | `#584e51` | `#0c0b0c` | `#FAFCFB` | `#c38b7b · #6B5E73 · #87a9b0 · #a5a0b6 · #b59790 · #c4d8e2 · ?` |
| `lumon` | Omarchy-original (Severance-inspired cold-navy; own palette, not the unrelated public `lumon` VS Code schemes) | `dark` | `#8bc9eb` | `#243d56` | `#304860` | `#16242d` | `#d6e2ee` | `#4d86b0 · #6fa4c9 · #5e95bc · #b4e4f6 · #6fb8e3 · #8bc9eb · #8bc9eb` |
| `lupine` | Omarchy-original (light cool-blue) | `light` | `#3264eb` | `#d0d0d0` | `#9e9e9e` | `#fafafa` | `#212121` | `#c900c4 · #026fde · #4a2fd0 · #0c67de · #3264eb · #8a4ad7 · #026fde` |
| `osaka-jade` | Omarchy-original (born in the Omarchy/omakub family) | `dark` | `#509475` | `#32473B` | `#53685B` | `#111c18` | `#C1C497` | `#FF5345 · #459451 · #549e6a · #2DD5B7 · #509475 · #D2689C · #a2734b` |
| `retro-82` | Omarchy-original (retro terminal look; community mirror [OldJobobo/omarchy-retro-82-theme](https://github.com/OldJobobo/omarchy-retro-82-theme)) | `dark` | `#faa968` | `#134e5a` | `#2a6b78` | `#05182e` | `#f6dcac` | `#f85525 · #e97b3c · #028391 · #8cbfb8 · #3f8f8a · #3f8f8a · #faa968` |
| `ethereal` | Omarchy-original (built on Omarchy’s [omacom/aether.nvim](https://github.com/omacom/aether.nvim)) | `dark` | `#7d82d9` | `#252e56` | `#6d7db6` | `#060B1E` | `#ffcead` | `#ED5B5A · #E9BB4F · #92a593 · #a3bfd1 · #7d82d9 · #c89dc1 · #eb8b54` |
| `solitude` | Omarchy-original (quiet neutral) | `dark` | `#798186` | `#343d41` | `#4b4e55` | `#101315` | `#cacccc` | `#565d60 · #d9dbdc · #9fa5a9 · #707070 · #798186 · #aeaeae · ?` |
| `white` | Omarchy-original (plain light default) | `light` | `#6e6e6e` | `#c0c0c0` | `#808080` | `#ffffff` | `#000000` | `#2a2a2a · #4a4a4a · #3a3a3a · #3e3e3e · #1a1a1a · #2e2e2e · ?` |

Note: `muted` here is a *terminal* muted tone (border-ish), comparable to `--t-border-strong`; the site CSS `--t-text-muted` is the text-muted color. `ristretto` sample ANSI values: red `#fd6883`, yellow `#f9cc6c`, orange `#fb9a77`, green `#adda78`, cyan `#85dacc`, blue `#f38d70`, magenta `#a8a9eb`. A `?` in the ANSI column means the theme’s `colors.toml` defines no orange tone (e.g. `last-horizon`, `solitude`, `white`).

## 5. From palette to chat-UI parts (buttons, sidebar, user text, bot reply, input)
### 5.1 The semantic-role model (how CLI chat UIs do it)

A chat UI never consumes the raw ANSI palette directly — it maps palette colors to *semantic roles*. The [opencode CLI theme format](https://opencode.ai/docs/themes/) is the clearest public example: a `defs` block holds the named palette colors, and a `theme` block assigns them to roles such as `primary`, `secondary`, `accent`, `error`, `warning`, `success`, `info`, `text`, `textMuted`, `background`, `backgroundPanel`, `backgroundElement`, `border`, `borderActive`, `borderSubtle`, plus markdown/syntax roles. Its built-in Nord theme, for instance, maps Nord’s 16 colors to the roles like `primary: nord8`, `error: nord11`, `warning: nord12`, `success: nord14`, `text: nord4`, `background: nord0`, `backgroundPanel: nord1`, `border: nord2`.

DSH Harness for this purpose is analogous to that model, but its *native* theme surface is smaller (see §6): background layers, brand, text layers, borders, state colors, sidebar. The table below is the mapping used for the rest of this document.

| Chat UI part (as you asked) | Canonical palette role | Omarchy var | DSH native token (§6.2) |
|---|---|---|---|
| Primary button | accent / brand | `--t-brand` | `--dsw-alias-brand-primary` (+ `--dsw-alias-button-primary-fill`) |
| Sidebar | panel/bg2 | `--t-bg-deep`/`--t-hdr-surface` | `--dsw-specific-sidebar-fill` |
| User text | text/fg | `--t-text` | `--dsw-alias-label-primary` |
| User bubble (user only) | accent-tint on surface | `--t-brand-soft` over `--t-bg` | `--dsw-specific-bubble` (see caveat 7.4) |
| Bot reply (assistant) | text/fg on plain page bg | `--t-text` on `--t-bg` | `--dsw-alias-label-primary` on `--dsw-alias-bg-base` — **no bubble** |
| Text input field | field bg | `--t-field-bg` (+ `--t-field-lit` accent band) | `--dsw-specific-input-major` (+ border) |
| App background | bg/base | `--t-bg` (deep: `--t-bg-deep`) | `--dsw-alias-bg-base` (deep: `--dsw-alias-bg-layer-1`) |
| Secondary text | secondary fg | `--t-text-secondary` | `--dsw-alias-label-secondary` |
| Borders | border | `--t-border-subtle`/`--t-border-strong` | `--dsw-alias-border-l1`/`--dsw-alias-border-l2` |
| Selection | selection | `--t-selection` | (no native token; keep DSH default or CSS) |
| Error / warning / success| red / yellow / green | `colors.toml` ANSI 8 (§4.3) or canonical palette | `--dsw-alias-state-error-primary` / `-warn-` / `-success-` |

### 5.2 The five parts you named, per theme (22 themes)

Solid values ready to use. The **user bubble** cell is the Omarchy brand tint **blended over the app background** to a solid hex (`brand-soft` 12 % over `--t-bg`) so it can be fed to a solid-color token — the tinted `…1f` cells in `4.1` become solid here. The **bot reply** is *not* a bubble in DSH: the assistant renders as plain markdown text (`color: var(--dsw-alias-label-primary)`) directly on the app background, so it takes the same color as **User text** below.

| UI part / token | Tokyo Night | White | Catppuccin | Gruvbox | Matte Black | Rosé Pine | Catppuccin Latte | Ethereal | Everforest | Flexoki Light | Hackerman | Kanagawa | Last Horizon | Lumon | Lupine | Miasma | Nord | Osaka Jade | Retro 82 | Ristretto | Solitude | Vantablack |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Primary button** `--t-brand` | `#9ece6a` | `#6e6e6e` | `#89b4fa` | `#7daea3` | `#e68e0d` | `#56949f` | `#1e66f5` | `#7d82d9` | `#7fbbb3` | `#205ea6` | `#82fb9c` | `#dcd7ba` | `#b59790` | `#8bc9eb` | `#3264eb` | `#78824b` | `#81a1c1` | `#509475` | `#faa968` | `#f38d70` | `#798186` | `#8d8d8d` |
| **Sidebar** `--t-hdr-surface` | `#2d3044` | `#000` | `#383852` | `#484645` | `#212121` | `#000` | `#000` | `#10183c` | `#485760` | `#000` | `#16182b` | `#323a4e` | `#121112` | `#243a4c` | `#000` | `#393939` | `#4e576c` | `#23382e` | `#0a2a4e` | `#4c3e3c` | `#181d20` | `#141414` |
| **User text** `--t-text` | `#c0caf5` | `#000` | `#cdd6f4` | `#d4be98` | `#eaeaea` | `#575279` | `#4c4f69` | `#ffcead` | `#d3c6aa` | `#100f0f` | `#ddf7ff` | `#dcd7ba` | `#fafcfb` | `#f2fcff` | `#000` | `#c2c2b0` | `#d8dee9` | `#f7e8b2` | `#f6dcac` | `#e6d9db` | `#cacccc` | `#fff` |
| **User bubble** (blend) | `#2a312e` | `#ededed` | `#2b3047` | `#323837` | `#2c2111` | `#e6e8e4` | `#d6e0f5` | `#141935` | `#37454a` | `#e4e9e7` | `#192926` | `#36353a` | `#211c1c` | `#243844` | `#e2e8f8` | `#2c2e27` | `#384150` | `#192b23` | `#232a35` | `#44322e` | `#1d2023` | `#111111` |
| **Text input field** `--t-field-bg` | `#0e0e14` | `#e8e8e8` | `#101019` | `#161616` | `#090909` | `#e1dbd5` | `#d7d8dc` | `#030610` | `#181d20` | `#e5e2d8` | `#06060c` | `#111116` | `#060606` | `#0b1216` | `#dedede` | `#121212` | `#191c23` | `#090f0d` | `#020c17` | `#181414` | `#080a0b` | `#070707` |

> User-bubble blend formula: `round(bg·(1−0.1215) + brand·0.1215)` per RGB channel. If you prefer the *canonical* look of each theme, use the official tint instead (e.g. Catppuccin bubble = `#313244` surface1, Nord = `#3b4252` nord1, Tokyo Night = `#292e42` selection, Gruvbox = `#3c3836` bg1, Everforest = `#343f44` bg1, Kanagawa = `#2a2a37` sumiInk2, Rosé Pine = `#f2e9e1` overlay/dawn, Flexoki light = `#e6e4d9` base-100).

## 6. DeepSeek Harness: what a themes plugin can actually touch

Researched from the running harness (`Theme.listTokens`, client `theme` Service) and the DSH source (`packages/client/ui-theme/src/styles/design-platform.css`, chat CSS in `ui-chat`/`ui-conversation`).

### 6.1 The `theme` Service (client)

| Method | What it does |
|---|---|
| `getTheme(): ThemeSnapshot` | read the active theme snapshot (`preference`, `active`, `themes`, `revision`, `fontSize`) |
| `setTheme(id)` | switch preference — `light`, `dark`, `system`, or a registered theme id |
| `register({ id, colorScheme, tokens })` | register a **whole theme**; `tokens` is `Record<string,string>` (single value per token, the theme declares its own `colorScheme`) |
| `overrideTokens(source, tokens)` | stack a **token-override layer**: `tokens` is `Record<token, {light, dark}>`; later layers win per token; returns a disposer. **This is what a dynamic plugin uses** — one layer per package |
| `theme/change` (event) | emitted on every recomposition |

A dynamic Cordis plugin would call `overrideTokens` (or `register` for selectable themes) from the Client half. Every override is cleaned up automatically when the plugin stops.

### 6.2 The 13 native overridable tokens (from `Theme.listTokens`)

Every token below **requires a light value AND a dark value** (`ThemeTokenModes = { light: string; dark: string }`). Defaults resolved from `design-platform.css` (light = `body`, dark = `body[data-ds-dark-theme]`).

| DSH token | What it colors | Default light | Default dark |
|---|---|---|---|
| `--dsw-alias-bg-base` | Application base background | `#ffffff` | `#151517` |
| `--dsw-alias-bg-layer-1` | Primary raised surface | `#ffffff` | `#232324` |
| `--dsw-alias-bg-layer-2` | Secondary nested surface | `#ffffff` | `#2c2c2e` |
| `--dsw-alias-bg-overlay` | Overlay / popover background | `#e9ecf2` | `#43454a` |
| `--dsw-alias-border-l1` | Primary subtle border | `rgba(0,0,0,.04)` | `rgba(255,255,255,.06)` |
| `--dsw-alias-border-l2` | Secondary stronger border | `rgba(0,0,0,.10)` | `rgba(255,255,255,.12)` |
| `--dsw-alias-brand-primary` | Primary brand accent (primary buttons inherit it) | `#0f1115` | `#f1f3f5` |
| `--dsw-alias-label-primary` | Primary text | `#0f1115` | `#f1f3f5` |
| `--dsw-alias-label-secondary` | Secondary text | `#43454a` | `#cfd3d6` |
| `--dsw-alias-state-error-primary` | Error state | `#ec1313` | `#f25a5a` |
| `--dsw-alias-state-success-primary` | Success state | `#22c55e` | `#22c55e` |
| `--dsw-alias-state-warn-primary` | Warning state | `#f59e0b` | `#f59e0b` |
| `--dsw-specific-sidebar-fill` | Sidebar column + title-row background | `#f5f6f7` | `#1b1b1c` |

### 6.3 Extended design-platform tokens that matter for a chat theme (not in the 13, set via CSS or as future tokens)

These are real DSH tokens in `design-platform.css`; the defaults are given as resolved hex. The bubble/input tokens are *not* exposed via `Theme.listTokens` today, so an override would need `styles.insert(css)` or the DSH team extending the token list — flagged in §7.4.

| DSH token | What it colors | Light | Dark |
|---|---|---|---|
| `--dsw-specific-bubble` | **User (and steering) message bubble background** | `#edf3fe` | `#2c2c2e` |
| `--dsw-specific-bubble-highlight` | Bubble highlight (citations etc.) | `#d3e2ff` | `#43454a` |
| `--dsw-specific-input-major` | **Text input field background** | `#ffffff` | `#2c2c2e` |
| `--dsw-specific-login-input` | Login input | `#f9fafb` | `#1b1b1c` |
| `--dsw-specific-menu` / `-selector` / `-tip` | menus, selectors, tips | `#fff`/`#f5f6f7`/`#f5f6f7` | `#353638` |
| `--dsw-alias-button-primary-fill` / `-hover` | Primary button fill / hover (fill = brand) | `var(--brand)` / `#43454a` | `var(--brand)` / `#ebeef2` |
| `--dsw-alias-button-ghost-active-fill` / `-hover` | Ghost/active buttons | `#ebeef2` / `#e9ecf2` | `#43454a` / `#61666b` |
| `--dsw-alias-button-contrast-fill` | Contrast button | `#61666b` | `#f1f3f5` |
| `--dsw-alias-button-info-fill` | Info button | `#4176e6` | `#679efe` |
| `--dsw-alias-label-tertiary` / `-caption` / `-dimmed` | tertiary / caption / dimmed text | `#81858c` / `#adb2b8` / `#e1e5ee` | `#adb2b8` / `#81858c` / `#43454a` |
| `--dsw-alias-link` | Links | `#4176e6` | `#679efe` |
| `--dsw-alias-markdown-code-block` / `-inline-code` / `-citation` | code blocks / inline code / citations | `#f9fafb` / `#fafafa` / `#ebeef2` | `#1b1b1c` / `#292929` / `#353638` |
| `--dsw-specific-sidebar-nav-item-active` / `-hover` / `-active-accent` | sidebar nav states | `#ebeef2` / `#f1f3f5` / `#e4edfd` | `#43454a` / `#2c2c2e` / `#353638` |

### 6.4 How the chat UI actually uses tokens

- **User message** (and steering/queued rows) is a bubble: `MessageItem.tsx` → `UserStyleBubble` — *"Right-aligned bubble shared by user and steering rows"* — sets `background: var(--dsw-specific-bubble)` and `color: var(--dsw-alias-label-primary)`.
- **Assistant reply is NOT a bubble.** `AssistantNodeView.tsx` renders `AssistantMarkdown`, whose CSS has **no background declaration** — only `color: var(--dsw-alias-label-primary)` on the app background. So the bot reply is plain page text and there is *no token to theme separately*: it follows `--dsw-alias-label-primary` / `--dsw-alias-bg-base` exactly like the user text does. (Tool-call chrome, reasoning rows and metadata use `--dsw-alias-label-tertiary` / `-caption` / `--dsw-alias-interactive-bg-hover*`.)
- **Text input field** (`InputBar.module.css`): `background: var(--dsw-specific-input-major)`, stroke `--dsw-alias-border-l2`, text `--dsw-alias-label-primary`, caret `--dsw-alias-state-business-primary`.
- **Sidebar**: `--dsw-specific-sidebar-fill`; active item `--dsw-specific-sidebar-nav-item-active` (+ `-active-accent`), hover `-hover`.
- **Primary buttons**: `--dsw-alias-button-primary-fill` **is `--dsw-alias-brand-primary`**, hover `--dsw-alias-button-primary-hover`.
- **Static color scale** (`--dsw-static-*`): neutral / neutral-bluish / blue / deepseek / green / red / amber — used as building blocks for the alias tokens; a theme plugin normally replaces alias/specific values, not static ones.

## 7. Mapping Omarchy → DS Harness tokens

### 7.1 Variable equivalence

| Omarchy variable | → DSH token | Notes |
|---|---|---|
| `--t-bg` | `--dsw-alias-bg-base` | main app canvas |
| `--t-bg-deep` | `--dsw-alias-bg-layer-1` | deepest canvas → raised layer |
| `--t-surface-2` | `--dsw-alias-bg-layer-2` | nested surfaces |
| `--t-surface` | `--dsw-alias-bg-overlay` | cards/overlays |
| `--t-border-subtle` | `--dsw-alias-border-l1` | quiet borders |
| `--t-border-strong` | `--dsw-alias-border-l2` | strong borders |
| `--t-brand` | `--dsw-alias-brand-primary` | brand/accent, primary buttons |
| `--t-text` | `--dsw-alias-label-primary` | main text |
| `--t-text-secondary` | `--dsw-alias-label-secondary` | secondary text |
| `--t-text-muted` | `--dsw-alias-label-tertiary` | muted/tertiary text (extended) |
| `red (ANSI/canonical)` | `--dsw-alias-state-error-primary` | state error |
| `green (ANSI/canonical)` | `--dsw-alias-state-success-primary` | state success |
| `yellow (ANSI/canonical)` | `--dsw-alias-state-warn-primary` | state warning |
| `--t-field-bg` | `--dsw-specific-input-major` | text input (extended token) |
| `--t-brand-soft over --t-bg` | `--dsw-specific-bubble` | user (and steering) bubble — extended token |
| `--t-text` on `--t-bg` | `--dsw-alias-label-primary` on `--dsw-alias-bg-base` | assistant reply: no bubble, plain text |
| `--t-bg-deep / --t-hdr-surface` | `--dsw-specific-sidebar-fill` | sidebar |
| `--t-hdr-*` | `(header)` | no native DSH header token — v1 can skip |

### 7.2 Recommended values for the 13 native DSH tokens, all 22 themes

Cell = the theme’s **own color-scheme value** (dark for the 17 dark themes, light for the 5 light themes). Every DSH token needs a `{light, dark}` pair — the **other** mode keeps the DSH default (see §7.3 for themes that provide both).

| DSH token ← Omarchy source | Tokyo Night | White | Catppuccin | Gruvbox | Matte Black | Rosé Pine | Catppuccin Latte | Ethereal | Everforest | Flexoki Light | Hackerman | Kanagawa | Last Horizon | Lumon | Lupine | Miasma | Nord | Osaka Jade | Retro 82 | Ristretto | Solitude | Vantablack |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `--dsw-alias-bg-base` ← `--t-bg` | `#1a1b26` | `#fff` | `#1e1e2e` | `#282828` | `#121212` | `#faf4ed` | `#eff1f5` | `#060b1e` | `#2d353b` | `#fffcf0` | `#0b0c16` | `#1f1f28` | `#0c0b0c` | `#16242d` | `#fafafa` | `#222` | `#2e3440` | `#111c18` | `#05182e` | `#2c2525` | `#101315` | `#000` |
| `--dsw-alias-bg-layer-1` ← `--t-bg-deep` | `#13141c` | `#f5f5f5` | `#161622` | `#1e1e1e` | `#0d0d0d` | `#ede7e1` | `#e3e4e8` | `#040816` | `#21272c` | `#f2efe4` | `#080910` | `#17171e` | `#090809` | `#101b21` | `#ececec` | `#191919` | `#222730` | `#0c1512` | `#031222` | `#211b1b` | `#0c0e10` | `#090909` |
| `--dsw-alias-bg-layer-2` ← `--t-surface-2` | `#24283b` | `#f5f5f5` | `#313244` | `#3c3836` | `#1e1e1e` | `#ede7e1` | `#e3e4e8` | `#131a3a` | `#343f44` | `#f2efe4` | `#151828` | `#223249` | `#0c0b0c` | `#1b2d40` | `#ececec` | `#2c2c2c` | `#3b4252` | `#23372b` | `#0a2540` | `#3d2f2a` | `#101315` | `#1a1a1a` |
| `--dsw-alias-bg-overlay` ← `--t-surface` | `#1f2230` | `#fff` | `#282839` | `#32302f` | `#181818` | `#fffaf3` | `#f8f9fb` | `#0c122c` | `#303a40` | `#f9f6ea` | `#10121f` | `#202838` | `#0c0b0c` | `#182836` | `#fff` | `#272727` | `#343b49` | `#1a2a22` | `#081e37` | `#342a28` | `#101315` | `#0d0d0d` |
| `--dsw-alias-border-l1` ← `--t-border-subtle` | `#24283b` | `#e8e8e8` | `#313244` | `#3c3836` | `#1e1e1e` | `#e1dbd5` | `#d7d8dc` | `#131a3a` | `#343f44` | `#e5e2d8` | `#151828` | `#223249` | `#0c0b0c` | `#1b2d40` | `#dedede` | `#2c2c2c` | `#3b4252` | `#23372b` | `#0a2540` | `#3d2f2a` | `#101315` | `#1a1a1a` |
| `--dsw-alias-border-l2` ← `--t-border-strong` | `#414868` | `silver` | `#585b70` | `#665c54` | `#333` | `#cecacd` | `#acb0be` | `#6d7db6` | `#475258` | `#b7b5ac` | `#2d3450` | `#54546d` | `#584e51` | `#304860` | `#9e9e9e` | `#666` | `#4c566a` | `#53685b` | `#2a6b78` | `#72696a` | `#4b4e55` | `#7a7a7a` |
| `--dsw-alias-brand-primary` ← `--t-brand` | `#9ece6a` | `#6e6e6e` | `#89b4fa` | `#7daea3` | `#e68e0d` | `#56949f` | `#1e66f5` | `#7d82d9` | `#7fbbb3` | `#205ea6` | `#82fb9c` | `#dcd7ba` | `#b59790` | `#8bc9eb` | `#3264eb` | `#78824b` | `#81a1c1` | `#509475` | `#faa968` | `#f38d70` | `#798186` | `#8d8d8d` |
| `--dsw-alias-label-primary` ← `--t-text` | `#c0caf5` | `#000` | `#cdd6f4` | `#d4be98` | `#eaeaea` | `#575279` | `#4c4f69` | `#ffcead` | `#d3c6aa` | `#100f0f` | `#ddf7ff` | `#dcd7ba` | `#fafcfb` | `#f2fcff` | `#000` | `#c2c2b0` | `#d8dee9` | `#f7e8b2` | `#f6dcac` | `#e6d9db` | `#cacccc` | `#fff` |
| `--dsw-alias-label-secondary` ← `--t-text-secondary` | `#a9b1d6` | `#383838` | `#cdd6f4` | `#d4be98` | `#bebebe` | `#5e587d` | `#53556f` | `#ffcead` | `#d3c6aa` | `#454340` | `#ddf7ff` | `#dcd7ba` | `#e2dddc` | `#d6e2ee` | `#212121` | `#c2c2b0` | `#d8dee9` | `#c1c497` | `#f6dcac` | `#e6d9db` | `#a5aeb4` | `#fff` |
| `--dsw-alias-state-error-primary` ← red (canonical / colors.toml) | `#f7768e` | `#2a2a2a` | `#f38ba8` | `#fb4934` | `#D35F5F` | `#b4637a` | `#d20f39` | `#ED5B5A` | `#e67e80` | `#af3029` | `#50f872` | `#e46876` | `#c38b7b` | `#4d86b0` | `#c900c4` | `#685742` | `#bf616a` | `#FF5345` | `#f85525` | `#fd6883` | `#565d60` | `#a4a4a4` |
| `--dsw-alias-state-success-primary` ← green | `#9ece6a` | `#3a3a3a` | `#a6e3a1` | `#b8bb26` | `#FFC107` | `#56949f` | `#40a02b` | `#92a593` | `#a7c080` | `#66800b` | `#4fe88f` | `#98bb6c` | `#87a9b0` | `#5e95bc` | `#4a2fd0` | `#5f875f` | `#a3be8c` | `#549e6a` | `#028391` | `#adda78` | `#9fa5a9` | `#b6b6b6` |
| `--dsw-alias-state-warn-primary` ← yellow | `#e0af68` | `#4a4a4a` | `#f9e2af` | `#fabd2f` | `#b91c1c` | `#ea9d34` | `#df8e1d` | `#E9BB4F` | `#dbbc7f` | `#ad8301` | `#50f7d4` | `#e6c384` | `#6B5E73` | `#6fa4c9` | `#026fde` | `#b36d43` | `#ebcb8b` | `#459451` | `#e97b3c` | `#f9cc6c` | `#d9dbdc` | `#cecece` |
| `--dsw-specific-sidebar-fill` ← `--t-bg-deep` | `#13141c` | `#f5f5f5` | `#161622` | `#1e1e1e` | `#0d0d0d` | `#ede7e1` | `#e3e4e8` | `#040816` | `#21272c` | `#f2efe4` | `#080910` | `#17171e` | `#090809` | `#101b21` | `#ececec` | `#191919` | `#222730` | `#0c1512` | `#031222` | `#211b1b` | `#0c0e10` | `#090909` |

### 7.3 Worked examples — full `{light, dark}` override sets

The plugin path for a *dark* theme (e.g. Gruvbox) is `overrideTokens(source, {token: {light: <light value>, dark: <gruvbox value>}})`. For themes that exist in both modes the pair is natural; for dark-only themes the light column uses the theme’s official light variant when one exists, otherwise the DSH default.

**Example A — Gruvbox** (both modes from the official palette; brand = orange `#fe8019`, the accent UI ports use)

| Token | light | dark |
|---|---|---|
| `--dsw-alias-bg-base` | `#fbf1c7` | `#282828` |
| `--dsw-alias-bg-layer-1` | `#ebdbb2` | `#1d2021` |
| `--dsw-alias-bg-layer-2` | `#d5c4a1` | `#32302f` |
| `--dsw-alias-bg-overlay` | `#f2e5bc` | `#3c3836` |
| `--dsw-alias-border-l1` | `#ebdbb2` | `#3c3836` |
| `--dsw-alias-border-l2` | `#d5c4a1` | `#665c54` |
| `--dsw-alias-brand-primary` | `#af3a03` | `#fe8019` |
| `--dsw-alias-label-primary` | `#282828` | `#ebdbb2` |
| `--dsw-alias-label-secondary` | `#504945` | `#d5c4a1` |
| `--dsw-alias-state-error-primary` | `#9d0006` | `#fb4934` |
| `--dsw-alias-state-success-primary` | `#79740e` | `#b8bb26` |
| `--dsw-alias-state-warn-primary` | `#b57614` | `#fabd2f` |
| `--dsw-specific-sidebar-fill` | `#fbf1c7` | `#1d2021` |
| (ext) `--dsw-specific-bubble` *(user)* | `#f2e5bc` | `#3c3836` |
| (ext) `--dsw-specific-input-major` | `#fbf1c7` | `#1d2021` |

**Example B — Catppuccin pair** (omarchy ships `catppuccin` = Mocha and `catppuccin-latte` = Latte; use them as the dark/light halves of one theme)

| Token | light (Latte) | dark (Mocha) |
|---|---|---|
| `--dsw-alias-bg-base` | `#eff1f5` | `#1e1e2e` |
| `--dsw-alias-bg-layer-1` | `#e6e9ef` | `#181825` |
| `--dsw-alias-bg-layer-2` | `#ccd0da` | `#313244` |
| `--dsw-alias-bg-overlay` | `#bcc0cc` | `#45475a` |
| `--dsw-alias-border-l1` | `#ccd0da` | `#313244` |
| `--dsw-alias-border-l2` | `#acb0be` | `#585b70` |
| `--dsw-alias-brand-primary` | `#1e66f5` | `#89b4fa` |
| `--dsw-alias-label-primary` | `#4c4f69` | `#cdd6f4` |
| `--dsw-alias-label-secondary` | `#5c5f77` | `#bac2de` |
| `--dsw-alias-state-error-primary` | `#d20f39` | `#f38ba8` |
| `--dsw-alias-state-success-primary` | `#40a02b` | `#a6e3a1` |
| `--dsw-alias-state-warn-primary` | `#df8e1d` | `#f9e2af` |
| `--dsw-specific-sidebar-fill` | `#e6e9ef` | `#181825` |
| (ext) `--dsw-specific-bubble` *(user)* | `#e6e9ef` | `#313244` |

**Example C — Tokyo Night** (dark-only; light half = official Tokyo Night light variant)

| Token | light (official light) | dark (Night) |
|---|---|---|
| `--dsw-alias-bg-base` | `#e6e7ed` | `#1a1b26` |
| `--dsw-alias-bg-layer-1` | `#d6d9e3` | `#16161e` |
| `--dsw-alias-bg-layer-2` | `#c9cfe0` | `#24283b` |
| `--dsw-alias-bg-overlay` | `#d6d9e3` | `#1f2230` |
| `--dsw-alias-border-l1` | `#c9cfe0` | `#24283b` |
| `--dsw-alias-border-l2` | `#a8aecb` | `#414868` |
| `--dsw-alias-brand-primary` | `#2959aa` | `#9ece6a` *(omarchy brand; canonical accent is `#3d59a1`)* |
| `--dsw-alias-label-primary` | `#343b58` | `#c0caf5` |
| `--dsw-alias-label-secondary` | `#6c6e75` | `#a9b1d6` |
| `--dsw-alias-state-error-primary` | `#8c4351` | `#f7768e` |
| `--dsw-alias-state-success-primary` | `#385f0d` | `#9ece6a` |
| `--dsw-alias-state-warn-primary` | `#8f5e15` | `#e0af68` |
| `--dsw-specific-sidebar-fill` | `#d6d9e3` | `#16161e` |
| (ext) `--dsw-specific-bubble` *(user)* | `#c9cfe0` | `#292e42` |

> The Tokyo Night official *light* variant only defines bg/text/accents; the light `-layer-*`/`-border-*`/bubble values above are interpolated from those (lighter steps of the same hue). Swap them for the DSH defaults if you prefer.

**Example D — Rosé Pine** (the Omarchy picker ships the *light*/Dawn variant; pair it with the main/dark variant)

| Token | light (Dawn) | dark (Main) |
|---|---|---|
| `--dsw-alias-bg-base` | `#faf4ed` | `#191724` |
| `--dsw-alias-bg-layer-1` | `#f2e9e1` | `#1f1d2e` |
| `--dsw-alias-bg-layer-2` | `#dfdad9` | `#26233a` |
| `--dsw-alias-bg-overlay` | `#fffaf3` | `#1f1d2e` |
| `--dsw-alias-border-l1` | `#f2e9e1` | `#26233a` |
| `--dsw-alias-border-l2` | `#cecacd` | `#403d52` |
| `--dsw-alias-brand-primary` | `#907aa9` | `#c4a7e7` |
| `--dsw-alias-label-primary` | `#575279` | `#e0def4` |
| `--dsw-alias-label-secondary` | `#797593` | `#908caa` |
| `--dsw-alias-state-error-primary` | `#b4637a` | `#eb6f92` |
| `--dsw-alias-state-success-primary` | `#56949f` | `#9ccfd8` |
| `--dsw-alias-state-warn-primary` | `#ea9d34` | `#f6c177` |
| `--dsw-specific-sidebar-fill` | `#f2e9e1` | `#1f1d2e` |
| (ext) `--dsw-specific-bubble` *(user)* | `#f2e9e1` | `#403d52` |

### 7.4 Caveats & decisions for the future plugin

1. **Only the user message is a bubble.** `--dsw-specific-bubble` styles the user/steering bubble; the assistant reply is plain markdown on the app background with no background token. So there is nothing to differentiate — but it also means **you cannot give the bot reply its own bubble** with the current token surface. Doing that would need per-component CSS (`styles.insert`) on the assistant node, or an upstream token.
2. **`--dsw-specific-bubble` / `--dsw-specific-input-major` are not in the 13 `Theme.listTokens`** — overriding them today requires CSS injection in addition to `overrideTokens`; the 13 native tokens are the safe core.
3. **Brand choice**: Omarchy retunes brands (Tokyo Night green `#9ece6a`, Gruvbox aqua `#7daea3`). For "Omarchy look" use `--t-brand` verbatim; for "canonical look" substitute official accents (Tokyo Night `#3d59a1`, Gruvbox `#fe8019`, Nord `#88c0d0`, Kanagawa `#7e9cd8`, Everforest `#a7c080`, Catppuccin `#89b4fa`/mauve, Rose Pine iris, Flexoki cyan).
4. **Both-modes strategy**: 5 themes are light-only in Omarchy and 17 dark-only. Pair intentionally: `catppuccin`↔`catppuccin-latte`, `rose-pine`(light)↔rose-pine main, `gruvbox`↔gruvbox light, `flexoki-light`↔flexoki dark, `tokyo-night`↔official light variant, `everforest`↔light accents, `lupine`/`white`↔a neutral dark. Otherwise keep the partner mode at DSH default so text/bg contrast never breaks.
5. **State colors** come from canonical palettes (§4.2) or Omarchy `colors.toml` (§4.3). For the 13 omarchy-original themes the ANSI 8 in `colors.toml` map directly: red→error, yellow→warn, green→success.
6. **Borders/overlays**: DSH defaults are translucent (`rgba(…,0.04–0.2)`); Omarchy ships solid border colors. Solid borders look fine, but translucent keeps the DSH layering look — your choice per theme.
7. **Selection**: no native DSH token; keep the DSH default or add CSS.
8. **Applying**: use the Client-half `theme` Service — `overrideTokens(<packageId>, tokens)` for instant preview, `register({id, colorScheme, tokens})` if the theme should appear in the theme picker. See §6.1.

## 8. Sources

**Omarchy home page & CSS**
- https://omarchy.org — home page (theme picker: 22 themes, 17 dark / 5 light)
- https://omarchy.org/themes/ — full community theme list (not used for the 22; only for context)
- Home-page CSS bundle: `/_astro/page-seo.DcPwmISg.css` (parsed `[data-theme=…]` blocks → §3/§4.1)
- Omarchy repo (theme source of truth): https://github.com/omacom/omarchy — `quattro` branch, `themes/<id>/colors.toml` → §4.3

**Official theme palettes (canonical values, §4.2)**
- Tokyo Night: https://github.com/enkia/tokyo-night-vscode-theme · https://github.com/folke/tokyonight.nvim
- Gruvbox: https://github.com/morhetz/gruvbox (`colors/gruvbox.vim`)
- Catppuccin: https://catppuccin.com/palette/ · https://github.com/catppuccin/palette · https://github.com/catppuccin/catppuccin (style guide)
- Nord: https://www.nordtheme.com/docs/colors-and-palettes
- Kanagawa: https://github.com/rebelot/kanagawa.nvim
- Everforest: https://github.com/sainnhe/everforest (`palette.md`)
- Rosé Pine: https://rosepinetheme.com/palette · https://github.com/rose-pine/rose-pine-palette
- Flexoki: https://stephango.com/flexoki · https://github.com/kepano/flexoki

**Chat-CLI theme mapping reference**
- opencode CLI themes: https://opencode.ai/docs/themes/ · https://dev.opencode.ai/docs/themes/ (theme JSON format: `defs` + semantic roles; built-in `osaka-jade` etc.)

**DeepSeek Harness (running harness + source)**
- Client `Theme.listTokens` (13 overridable tokens, light+dark required) and client `theme` Service (`getTheme` / `setTheme` / `register` / `overrideTokens`, `theme/change`) — inspected live
- `packages/client/ui-theme/src/styles/design-platform.css` — alias/specific token defaults (`body` + `body[data-ds-dark-theme]`)
- `packages/client/ui-chat/src/client/chat/MessageItem.module.css` + `MessageItem.tsx` — **user** (and steering) bubble (`--dsw-specific-bubble`, `--dsw-alias-label-primary`); `UserStyleBubble` doc comment: *"Right-aligned bubble shared by user and steering rows"*
- `packages/client/ui-chat/src/client/chat/AssistantMarkdown.module.css` — **assistant reply: no background**, only `color: var(--dsw-alias-label-primary)`
- `packages/client/ui-conversation/src/client/skeleton/InputBar.module.css` — text input (`--dsw-specific-input-major`, `--dsw-alias-border-l2`, caret `--dsw-alias-state-business-primary`)

---
*Prepared as research for a DeepSeek Harness themes plugin. No code was changed in DSH or Omarchy; no plugin was implemented.*
