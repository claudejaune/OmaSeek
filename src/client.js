/**
 * The `omaseek` browser half — one page plugin that carries the whole family.
 *
 * The client-module system mounts a package under a single bare name, so the
 * three features arrive through one entry and one `apply`. Each stays a module
 * of its own with its own Settings section and its own fiber-owned effects, so
 * splitting them into separate packages later is a matter of moving a file and
 * adding a row, not of unpicking shared state.
 */

import { applyFeature as applyMusic } from './client/music.js'
import { applyFeature as applyPixel } from './client/pixel.js'
import { applyFeature as applyThemes } from './client/themes.js'

export function apply(ctx) {
  applyThemes(ctx)
  applyPixel(ctx)
  applyMusic(ctx)
}
