# OmaMusic

omarchy.org's now-playing card for DeepSeek Harness: it floats in the bottom-left corner,
streams the track, and paints the spectrum the card animates.

One of three plugins in [OmaSeek](https://github.com/claudejaune/OmaSeek) — the others are the
themes and the hero pixel field. Each installs on its own.

## Install

```sh
dsh plugin --profile web add omaseek-music
```

Restart the harness and click the cover. It streams *We Can Fix Everything (The Ultimate
Machine)* by [Kevin Koontz](https://x.com/koozeex1) from Omarchy Radio, and says so on the card
when the network or the station is not there. The cover art ships with the plugin.

To play something else:

```sh
OMASEEK_MUSIC_URL=https://example.com/track.mp3   # stream another track
OMASEEK_MUSIC_PATH=/home/you/Music/track.mp3      # …or a local file instead
```

## License

MIT — the card is a port of omarchy.org's own; see
[CREDITS.md](https://github.com/claudejaune/OmaSeek/blob/main/CREDITS.md).
