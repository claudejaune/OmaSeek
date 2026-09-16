# OmaPixel

The New Session hero for DeepSeek Harness: the headline types omarchy.org's rotation, and the
pixel field drifts behind it, lights under the cursor and takes a press.

One of three plugins in [OmaSeek](https://github.com/claudejaune/OmaSeek) — the others are the
themes and the now-playing card. Each installs on its own.

## Install

```sh
npx @deepseek-ai/dsh plugin --profile web add omaseek-pixel   # running with npx
pnpm dsh plugin --profile web add omaseek-pixel               # running from a source checkout
```

Restart the harness, then open a New Session. **Settings → OmaPixel** switches the field
between Off, Ambient and Interactive, and the headline between Loop and Once. Both are
remembered, so the next session opens the way you left it.

## License

MIT — it is a port of omarchy.org's own hero; see
[CREDITS.md](https://github.com/claudejaune/OmaSeek/blob/main/CREDITS.md).
