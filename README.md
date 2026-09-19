# OmaSeek: Omarchy 🤝 DeepSeek Harness

Use DeepSeek Harness and hate the boring light-dark themes? In love with the Omarchy spirit and aesthetics? We got you covered!

Three plugins:

1. **Themes**: all 22 Omarchy light/dark themes, rectangular buttons
2. **Pixel**: The cool pixel animations on [omarchy.org](https://omarchy.org/)
3. **Music**: Streams **Omarchy Radio** — every song in [the station's playlist](https://radio.omarchy.org), with back/play/forward on the card, and a rail to fold it down to just the mark

https://github.com/user-attachments/assets/00b55a6a-9f12-4df9-be09-c113dfd9fb79

## Quick start

### `npx` users

If you use `npx @deepseek-ai/dsh web` to launch DSH, do this to install all three plugins:

```
npx @deepseek-ai/dsh plugin --profile web add omaseek-themes omaseek-pixel omaseek-music
```

OR, pick and choose. Eg., if you don't care about the music player, use this:

```
npx @deepseek-ai/dsh plugin --profile web add omaseek-themes omaseek-pixel
```

Then restart the harness.

### Source install users

If you build `dsh` manually from source, run this to install all plugins:

```
cd /path/to/deepseek-harness
pnpm dsh plugin --profile web add omaseek-themes omaseek-pixel omaseek-music
```

OR, pick and choose. Eg., if you don't care about the music player, use this:

```
cd /path/to/deepseek-harness
pnpm dsh plugin --profile web add omaseek-themes omaseek-pixel
```

## Variables

### Settings → OmaThemes

- Appearance (Light / Dark / System), themes (duh), and corner shapes (squircle/square)

### Settings → OmaPixel

- Pixel field: _Off_, _Ambient_ (only the background animations), or _Interactive_ (cursor glow and press-to-stamp).
- Headline: _Loop_ forever or just play _Once_

## Documentation

- [docs/how-it-works.md](docs/how-it-works.md): technical details for nerds and clankers
- [docs/contributing.md](docs/contributing.md)
- [CREDITS.md](CREDITS.md)

## Credits

- [DHH]([url](https://x.com/dhh)) (duh) and his beautiful creation **Omarchy**: the themes, the hero field, the headline rotation and the music card are all ports of [omarchy.org](https://github.com/omacom/omarchy-site)'s own front end.
- [DeepSeek Harness](https://deepseek.com/harness/en/) (also duh): Everything is a plugin, just like OmaSeek
- *We Can Fix Everything (The Ultimate Machine)* by [Kevin Koontz](https://x.com/koozeex1)

## License

MIT — see [LICENSE](LICENSE).
