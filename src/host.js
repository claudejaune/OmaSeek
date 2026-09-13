/**
 * The `omaseek` Node half.
 *
 * It exists for exactly one reason: the browser cannot read `themes.md` or the
 * music file, so the two features that need bytes off this machine ask for them
 * over the Connection Fetch bridge — an authenticated same-origin `/api/*`
 * route the harness already fences for its own requests. Everything else in
 * this package is browser-side and imports nothing from here.
 *
 * A host with no browser surface (the headless and TUI profiles) has no
 * `connection` service; each registrar returns rather than failing, so the
 * package loads into any composition.
 */

import { registerMusicRoutes } from './host/music.js'
import { registerThemeRoutes } from './host/themes.js'

export const name = 'omaseek'

export function apply(ctx) {
  registerThemeRoutes(ctx)
  registerMusicRoutes(ctx)
}
