# OmaSeek changelog

All notable changes to this project will be documented in this file.

## omaseek-music

### 0.2.5 - 2026-09-19

#### Added

- The card can now be collapsed. A rail down its right edge folds it to the width of the Omarchy mark, with just the play/pause button under it — no title, no artist, no meter, no seek bar. The chevron points left while the card is open and right while it is shut, and says "Collapse" or "Expand" when you hover it
- The card remembers the song it was on and how far into it. A refresh puts it back in place, paused, ready for one press — and a tab that gets killed outright still comes back within five seconds of the mark
- The card keeps the spot it was dragged to. It no longer snaps back to the bottom-left corner on every reload — and if the window it comes back into is smaller than the one it left, it is pulled back inside rather than being lost off the edge

#### Changed

- The artwork is no longer a play/pause button. It was the transport's job already; now it just shows the mark, drags the card, and shows the same hover tooltip as the rest of it
- Every border and dividing line on the card now uses the same token the shell's own chrome draws with, so the card reads as part of the interface rather than as a paler thing floating over it. Still fully theme-driven — nothing is a literal colour

#### Fixed

- Long artist names no longer wrap onto a second line over the track name. The artist is now cut with an ellipsis the way the title always was, with the full name in the hover tooltip

### 0.2.2 - 2026-09-16

#### Added

- Pressing play now asks for the station again when it could not be read, so a network that comes back does not need a page reload

### 0.2.1 - 2026-09-16

#### Fixed

- The music card no longer starts with its transport pushed below the bottom edge of the window, and a card that has been dragged stays on screen when the window shrinks

### 0.2.0 - 2026-09-15

#### Added

- OmaSeek Music now plays every single track on radio.omarchy.org, complete with Play/Pause, Previous, Next buttons and a seek bar

## omaseek-pixel

### 0.2.0 - 2026-09-16

#### Added

- The Pixel field and Headline choices are remembered across reloads, instead of going back to Interactive and Loop

#### Fixed

- Switching the field between Ambient and Interactive now takes effect at once, rather than only after a page reload

## omaseek-themes

### 0.1.2 - 2026-09-15

#### Fixed

- Picking a model no longer drops the app back to the harness' built-in (boring) dark/light palette
