# OmaMusic

omarchy.org's now-playing card for DeepSeek Harness: it floats in the bottom-left corner,
plays **Omarchy Radio** — every song in [the station's playlist](https://radio.omarchy.org),
in the order the site plays them — and paints the spectrum the card animates.

The transport is the deck's own: back, play, forward, on the card's own bitmaps. The queue
wraps at both ends, and a song that ends walks into the next one if you had it playing.

One of three plugins in [OmaSeek](https://github.com/claudejaune/OmaSeek) — the others are the
themes and the hero pixel field. Each installs on its own.

## Install

```sh
npx @deepseek-ai/dsh plugin --profile web add omaseek-music   # running with npx
pnpm dsh plugin --profile web add omaseek-music               # running from a source checkout
```

Restart the harness and click the cover. The songs stream from Omarchy Radio's own host, and
the card says so when the network or the station is not there. It plays the station and nothing
else — there is no setting to point it at a song of your own.

## The picture

The card wears the Omarchy mark, and every song wears the same one — deliberately. Of the 33
songs in the station's playlist, exactly one has a picture in its ID3 tag, so resolving art per
song was machinery that answered "no" almost every time. `art/omarchy.png` is the whole of it.

## License

MIT — the card is a port of omarchy.org's own; see
[CREDITS.md](https://github.com/claudejaune/OmaSeek/blob/main/CREDITS.md).
