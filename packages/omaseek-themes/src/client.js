/**
 * The `omaseek-themes` browser half.
 *
 * One package is one browser plugin — the client-module system mounts a browser
 * half by its package's bare name, and a row carries no more than that — so each
 * feature owns its entry, its bundle and its row on the Plugins page.
 */

import { applyFeature as applyThemes } from './client/themes.js'

export function apply(ctx) {
  applyThemes(ctx)
}
