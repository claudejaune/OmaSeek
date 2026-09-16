# How it works

What each plugin is a port of, how the palettes become harness themes, and how a browser half
reaches the Node side. Nothing here is needed to use the plugins.

## The features

### OmaThemes — the themes

Every theme is registered with `theme.register({ id, colorScheme, tokens })` and contributes
the **Settings → OmaThemes** page: scheme chips, one card per theme with a live miniature of
its palette, the active one marked, and the corner shape (squircle or square) for the whole
harness.

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

**And it survives a settings write.** Writing *any* settings section — picking a model writes
the default-model one — republishes the settings mirror, and the harness answers by adopting
its durable `light`/`dark`/`system` preference over the picked palette. The picker puts its
palette back on the next microtask rather than in the change it is answering: a listener
registered after the picker's (ui-layout's token presenter, which is what paints `body`) is
handed the resetting snapshot last, so a repair made during the dispatch is exactly what gets
painted over — and with the Service already holding the wanted id, the picker would never
repair again.

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
  density.
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

**Switching it.** Settings → OmaPixel has two settings, each with its chips under a line of
description. **Pixel field** — `Off` runs nothing, `Ambient` is the drifting lattice alone,
`Interactive` adds the cursor glow and the press stamp. **Headline** — `Loop` is the site's
rotation above, `Once` types one random phrase per load and stops. Both are the reader's choices
rather than the page's: they are written to `localStorage` under `omaseek.pixel` and come back as
they were left, and a switch between `Ambient` and `Interactive` re-mounts the field instead of
waiting for a reload.

### OmaMusic

The site's now-playing card, playing **the whole station**: the browser half streams whatever
song is up through one `Audio` element, paints the spectrum the card animates, and walks the
list with the deck's own transport — back, play, forward.

**The catalogue is the station's playlist.** The Node half fetches
`radio.omarchy.org/tracks/playlist.json` — the same file the site is built from, so a song
submitted tomorrow plays today — caches it for ten minutes, and falls back on the copy kept in
`src/playlist.json` when the network is not there. Each track comes back with the station's own
address for its bytes.

**It streams from the station that hosts the songs.** Every track is served with CORS open (so
the meter can read the audio) and range requests (so seeking works). No audio ships with this
package, and there is no way to point the card at anything else: it plays the station, or it
says why it cannot.

The transport is the deck's: prev and play and next, the site's stepped bitmaps, and the queue
wraps at both ends. A song that ends walks on into the next one *if the listener had it playing*
— a song ending is not a reason to start making noise — and a track picked by hand always
sounds, because a press on next that played nothing would be a control that does nothing. A
track that fails while the card was the one choosing it is walked past once; past that, a
station that is down simply fails rather than running the whole list past the listener.

**The line along the foot is a seek bar, and pressing it anywhere seeks there.** A range input
answers a drag and the arrow keys but not a press on its own track, so the position is worked
out from the element's box and handed to the same handler. Hovering it swaps the artist for
`1:23 / 5:44`, the way the older card did — and the card sets that swap itself rather than
leaving it to a `:has()` selector, which it cannot read back and which fails silently where it
is not supported.

**The title and artist are also in a tooltip**, the whole of both, after a settle of hover rather
than immediately, and it gets out of the way the moment the card is dragged — the same behaviour
the card has always had, kept deliberately.

The songs the station labels **explicit** wear an `E` between the byline and the meter.

The card is **one fixed width** whatever is playing, with the title the only thing that gives,
by ellipsis. That was not always so: sized to its content, it took the width of the longest
title in the station, which left every other song with a column of empty space. The queue
counter has a box of its own for the same reason — `9/33` and `10/33` are different widths, and
everything to their right moved when the number gained a digit.

### When it cannot play

Whatever went wrong is named on the card. Not "the station could not be loaded" — the reason the
fetch gave, which is the difference between a card that looks broken and a card that says
`responded 500` and can be acted on. No network, a station that is not there, a station with
nothing to play: each says which it was, and a press on play is what asks again — for the station
when the card has nothing at all, and for the track when the station answered but that song did
not play.

A quiet one worth knowing about: a play the browser abandons — `interrupted by a call to
pause()`, which is what a second press does — arrives as a rejected promise from `play()` and is
not a failure at all. Read as one, it leaves the card failed with nothing to say and no way to
start it again. Each start carries a number and only the newest may report anything.

### One picture, for every song

The card wears the Omarchy mark, and every song wears the same one. That is a decision, not a
shortcut: of the thirty-three songs in the station's playlist, exactly **one** has a picture in
its ID3 tag. Resolving art per track cost a map, an extracted JPEG, and a lookup that answered
"no" thirty-two times in thirty-three, so it was taken back out. `art/omarchy.png` is the whole
of the card's artwork, and it belongs to the station rather than to a song: the catalogue carries
it once beside the list, not once on every track.

It is not per-song art that is the exception — it is art at all. A song submitted next month with
a beautiful cover of its own will wear the mark like the rest.

The mark is 40px and sits at the top of its row, which leaves 4px of clearance before the
progress line at the row's foot and 2px between that line and the transport. Those numbers are
not decoration: the artwork and the line were a single pixel apart before, which read as one
shape rather than two. The card itself is held to the window's bottom edge by the stylesheet's
own anchor and not by a measured offset — it has changed height once already, and the number
that was meant to follow it did not.

A stream needs the host to allow cross-origin reads for the meter; if it does not, the card
retries without CORS, plays the sound, and leaves the meter flat.

`packages/omaseek-music/assets/music/` in this checkout is a leftover from when the card played
one song — a copy of that track and its analysed spectrum. Nothing reads it, and it is untracked.

## Layout of the seam

A browser half reaches the page and the Node process through two seams:

- **Styles** go in as a tagged `<style>` element owned by the registering fiber
  (`insertSheet`), the way the shipped client plugins do it.
- **Browser → Node** goes over the Connection Fetch bridge:
  `ctx.connection.fetch.register({ path: '/api/omaseek.…', … })` on the Node half, an
  ordinary same-origin `fetch()` in the browser half. The themes plugin serves
  `/api/omaseek.themes`; the music plugin serves `/api/omaseek.music.tracks`, the station's
  catalogue; the hero needs no Node half at all. The carrier authenticates and fences
  `/api/*` before the plugin sees the request, so the plugin adds no auth of its own. Routes
  must live under `/api/` with segments matching `^[A-Za-z0-9_$.-]+$`.

A host with no browser surface (headless, TUI) has no `connection` service; a registrar
returns early rather than failing, so each plugin loads into any composition.

## How the theming works

`theme.register({ id, colorScheme, tokens })` is the whole API surface here, and it is wider
than `Theme.listTokens` suggests. `ui-layout`'s theme presenter
(`packages/client/ui-layout/src/client/theme-presenter.ts`) writes **every key** of the
active theme onto `body` as an inline CSS variable and picks the base palette from
`colorScheme` — so a registered theme may set any `--dsw-*` token, not just the 13 the
inspect API advertises:

- **The 13 native tokens** (backgrounds, surfaces, borders, brand, text, state colors,
  sidebar fill) — the safe core, listed by `Theme.listTokens`.
- **17 design-platform tokens outside that set** — `--dsw-specific-bubble`,
  `--dsw-specific-input-major`, `--dsw-alias-label-tertiary`, `--dsw-alias-link`, the markdown
  code blocks, menus and sidebar nav states. These need no CSS injection: a registered
  theme's values are applied the same way as the native ones.

Because a registered theme declares exactly one scheme, its `tokens` are plain values. The
`{ light, dark }` pair form belongs to `overrideTokens()` layers only, and this plugin uses no
layer.

**Derived colors.** Each theme's 15 source values expand to 30 tokens; the extras are blends
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
built-in `light`/`dark`/`system` preference to settings. OmaThemes therefore remembers its own
choice per scheme in `localStorage` (`omaseek.themes`) and re-applies it on load.

## Sources

Omarchy's own palette values come from the [Omarchy repo](https://github.com/omacom/omarchy)
(`themes/<id>/colors.toml`) and the home page's CSS bundle. Canonical palettes come from each
theme's official project — links for all of them are in the Sources section of `themes.md`.
The hero field and the now-playing card are ports of
`omarchy.org`'s `HeroPixelField.tsx` and its music card, and the track the card streams lives
at `radio.omarchy.org`.
