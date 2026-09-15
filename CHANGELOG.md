# OmaSeek changelog

All notable changes to this project will be documented in this file.

## omaseek-music

### 0.2.0 - 2026-09-15

#### Added

- The whole station, not one song: the card reads Omarchy Radio's own playlist, so every track it
  publishes plays, and a song submitted tomorrow plays today
- Previous and next on the card, on the deck's own bitmaps, wrapping at both ends
- A song that ends walks into the next one while the sound is on, and sits at the top of the next
  one when it is not
- The station's explicit label, worn as a badge on the songs that carry it

#### Changed

- The card wears the Omarchy mark, the same picture for every song. One file in thirty-three has a
  picture in its ID3 tag, so art was resolved per track for an answer that was almost always no;
  the lookup, the map and the extracted cover are gone with it

#### Removed

- `OMASEEK_MUSIC_URL`, `OMASEEK_MUSIC_PATH` and `OMASEEK_MUSIC_TIMELINE`, and the two routes and
  the byte plumbing behind them. The card plays the station and nothing else

## omaseek-themes

### 0.1.2 - 2026-09-15

#### Fixed

- Picking a model no longer drops the app back to the harness' built-in (boring) dark/light palette
