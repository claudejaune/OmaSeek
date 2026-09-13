# OmaSeek

Omarchy's home page for DeepSeek Harness: its 22 themes, its hero pixel field, and its
now-playing card.

Three plugins in one repository. Install any one of them, or all three.

## Quick start

```
# running the harness with npx
npx @deepseek-ai/dsh plugin --profile web add omaseek-themes omaseek-pixel omaseek-music

# running it from a source checkout
pnpm dsh plugin --profile web add omaseek-themes omaseek-pixel omaseek-music
```

Drop the names you do not want — `add omaseek-pixel` installs only the hero field. Restart
the harness afterwards. Each plugin is its own package with its own row, so they
appear — and load, reload and switch off — separately on the Plugins page.

Straight from GitHub instead of npm:

```
npx @deepseek-ai/dsh plugin --profile web add "github:claudejaune/OmaSeek#path:/packages/omaseek-pixel"
```

From a clone of this repository, the same command takes the folder as its argument:
`./packages/omaseek-pixel`. To remove one, `npx @deepseek-ai/dsh plugin --profile web remove
omaseek-pixel`. If `dsh` happens to be on your PATH, the plain `dsh` works in place of
`npx @deepseek-ai/dsh` in every command above.

## The plugins

| Plugin | Package | What it does |
|---|---|---|
| **OmaSeek** | `omaseek-themes` | All 22 Omarchy home-page themes, with a picker that follows the light/dark scheme, and Omarchy's corner shapes |
| **OmaPixel** | `omaseek-pixel` | The New Session hero: the headline types the site's rotation, and the pixel field drifts and answers the cursor behind it |
| **OmaMusic** | `omaseek-music` | The site's now-playing card, floating in the bottom-left corner |

### What you can change

- **Settings → OmaSeek** — the scheme chips (Light / Dark / System), the palette cards, and the
  corner shape. It opens on Catppuccin: Latte while the app is light, Catppuccin while it is
  dark. Each scheme remembers the palette you picked for it, across reloads; picking Light or
  Dark is also how you keep the harness's own palette for that scheme.
- **Settings → OmaPixel** — **Pixel field**: Off, Ambient, or Interactive (cursor glow and
  press-to-stamp). **Headline**: Loop, the site's rotation, or Once.
- **OmaMusic** — click the cover to play. It streams the track, sets its own duration, and says
  on the card when the network or the station is not there. There is no settings page.

## The track

The card streams *We Can Fix Everything (The Ultimate Machine)* by
[Kevin Koontz](https://x.com/koozeex1) from Omarchy Radio, which is where it lives. To play
something else, set `OMASEEK_MUSIC_URL`, or `OMASEEK_MUSIC_PATH` for a local file — its cover
art ships with the plugin either way.

## Documentation

- [docs/how-it-works.md](docs/how-it-works.md) — the ports, the palette model, the browser-to-Node seam
- [docs/contributing.md](docs/contributing.md) — the layout, building, the test suite, releasing
- [CREDITS.md](CREDITS.md) — what came from where

## Credits

- **Omarchy** — the themes, the hero field, the headline rotation and the music card are all
  ports of [omarchy.org](https://github.com/omacom/omarchy-site)'s own front end.
- **DeepSeek Harness** — the plugin seams all of this is built on.

## License

MIT — see [LICENSE](LICENSE).
