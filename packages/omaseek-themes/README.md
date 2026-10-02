# OmaThemes

All 22 [Omarchy](https://omarchy.org) home-page themes as DeepSeek Harness themes, with a
picker that follows the light/dark scheme and Omarchy's corner shapes.

One of three plugins in [OmaSeek](https://github.com/claudejaune/OmaSeek) — the others are the
hero pixel field and the now-playing card. Each installs on its own.

## Install

```sh
npx @deepseek-ai/dsh plugin --profile web add omaseek-themes   # running with npx
pnpm dsh plugin --profile web add omaseek-themes               # running from a source checkout
```

Restart the harness, then look under **Settings → OmaThemes**. It opens on Catppuccin — Latte
while the app is light, Catppuccin while it is dark — and remembers what you pick per scheme,
across reloads. Picking Light or Dark keeps the harness's own palette for that scheme.

## Follow the desktop (optional)

With the [Omarchy Theme Sync](https://github.com/omacom/omarchy-theme-sync) browser extension
installed, the **System** chip is renamed **Omarchy** and follows your Omarchy desktop instead
of the browser: switch the desktop to Tokyo Night and the harness wears it, live, without a
reload. A desktop theme this package has no palette for is painted from its own colors, read
live from the desktop, so your community themes work too. Picking a theme card is a choice of
scheme as well as of colour — the chips move to **Light** or **Dark** and the desktop stops
driving that scheme, because a lit **Omarchy** over a palette the desktop no longer touches
would be a lie. Pressing **Omarchy** hands every scheme back to the desktop.

No extension, no change: the chip is **System** again, and System is the browser's own
light/dark, exactly as before.

```sh
git clone https://github.com/omacom/omarchy-theme-sync.git
cd omarchy-theme-sync && ./install.sh
```

Then restart the browser and check `chrome://extensions` for **Omarchy Theme Sync**. The
installer only knows the profile directories that existed when it was written — Brave Origin,
for one, needs `com.omarchy.theme.json` copied into its own `NativeMessagingHosts/` by hand.

## License

MIT. The themes are Omarchy's; see
[CREDITS.md](https://github.com/claudejaune/OmaSeek/blob/main/CREDITS.md).
