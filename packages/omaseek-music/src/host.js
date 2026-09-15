/**
 * OmaMusic — the Omarchy site's music card. Node half.
 *
 * Serves the station to this package's browser half over one Connection Fetch
 * route: `/api/omaseek.music.tracks`, the catalogue of songs.
 *
 * The songs themselves are never distributed with the package. They are the
 * community's, hosted by Omarchy Radio, and the card streams them from there:
 * the catalogue hands back the playlist's own `file` names resolved against
 * `https://radio.omarchy.org/tracks/`, and the browser reads those URLs
 * directly. The station answers them with `access-control-allow-origin: *`
 * and `accept-ranges: bytes`, which is what lets the card seek inside a song
 * and read it through the analyser without a proxy in the middle.
 *
 * The playlist is fetched live so a song submitted tomorrow plays today, with
 * the copy in `src/playlist.json` as the answer when the network is not there.
 * The only thing added to the station's own answer is the picture the card
 * wears, which is the same picture for every song.
 *
 * `fs` is an optional Service: a host that mounts one reads through its own
 * sandbox, and a host that does not gets the Node builtin reading the file
 * sitting next to this module. A picture that cannot be read is a quiet
 * answer, not a boot failure.
 */
import { fileURLToPath } from 'node:url'
import { readBytes, readText } from './files.js'

/**
 * The one picture the card wears, for every song.
 *
 * It is the Omarchy mark and nothing else. The station's songs almost never
 * carry cover art of their own — one file in thirty-three has a picture in its
 * ID3 tag — so looking one up per track was machinery that answered "no"
 * nearly every time. The card shows this instead, always.
 */
const LOGO_URL = new URL('../art/omarchy.png', import.meta.url)

/** The station: where its songs live, and the playlist that names them. */
const RADIO_HOME = 'https://radio.omarchy.org/'
const TRACKS_DIR = RADIO_HOME + 'tracks/'
const PLAYLIST_URL = TRACKS_DIR + 'playlist.json'

/** The playlist to fall back on: the same file, kept beside this module. */
const BUNDLED_PLAYLIST = new URL('./playlist.json', import.meta.url)

/** How long a fetched playlist is trusted before the station is asked again. */
const PLAYLIST_TTL = 10 * 60 * 1000

/** How long the station gets to answer before the bundled playlist wins. */
const PLAYLIST_TIMEOUT = 8000

/**
 * The whole station, newest submission included, out of the playlist the site
 * publishes. Text in, shapes out, so the bundled copy and the fetched one are
 * the same reading of the same file.
 */
function parsePlaylist(text) {
  const data = JSON.parse(text)
  const tracks = Array.isArray(data.tracks) ? data.tracks : []
  return {
    station: typeof data.station === 'string' ? data.station : 'omarchy',
    name: typeof data.name === 'string' ? data.name : 'Omarchy',
    tracks: tracks
      .filter((track) => track && typeof track.title === 'string' && track.title !== '')
      .map((track) => ({
        title: track.title,
        artist: typeof track.artist === 'string' ? track.artist : '',
        file: typeof track.file === 'string' ? track.file : '',
        explicit: track.explicit === true,
      })),
  }
}

/**
 * The plugin's entry point: register this package's routes on the browser
 * connection.
 *
 * All three hang off `ctx.inject` rather than a guard: this apply runs while
 * the composition is still assembling, so `ctx.get('connection')` at that
 * moment reads an empty registry and no route would ever appear. The injected
 * scope attaches them when a connection exists and disposes with the fiber; a
 * host with no browser half never runs the callback at all.
 */
export function apply(host) {
  host.inject(['connection'], function (ctx) {
    /** One catalogue per process, shared by every request. See `catalogue`. */
    registerTracksRoute(ctx, createCatalogue(ctx))
  })
}

/**
 * The station's playlist.
 *
 * The fetch is cached for ten minutes and the last good answer is kept for
 * good: a station that is briefly unreachable, or slow past its timeout, must
 * not empty a card that was playing a moment ago. Concurrent callers share one
 * fetch rather than each starting their own.
 */
function createCatalogue(ctx) {
  let cached = null
  let fetchedAt = 0
  let inFlight = null
  /** The mark, as a data URL: a shipped file, so it is read once per process. */
  let logo = null

  async function logoDataUrl() {
    if (logo !== null) return logo
    logo = ''
    try {
      const bytes = await readBytes(ctx, fileURLToPath(LOGO_URL), undefined, 1 << 20)
      logo = 'data:image/png;base64,' + Buffer.from(bytes).toString('base64')
    } catch (missing) {
      // No picture at all: the card's ring pulses over an empty plate, which
      // is what it did before there was a mark to draw.
    }
    return logo
  }

  /** The playlist from the station, or the copy beside this module. */
  async function readPlaylist() {
    const bundled = parsePlaylist(await readText(ctx, fileURLToPath(BUNDLED_PLAYLIST)))
    try {
      const response = await fetch(PLAYLIST_URL, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(PLAYLIST_TIMEOUT),
      })
      if (!response.ok) throw new Error('playlist responded ' + response.status)
      const live = parsePlaylist(await response.text())
      // A playlist that parses but names nothing is not an answer worth
      // keeping: the bundled one still is.
      if (live.tracks.length > 0) return live
      throw new Error('playlist named no tracks')
    } catch (error) {
      const message = String((error && error.message) || error)
      console.log('omaseek: reading the bundled playlist — ' + message)
      return bundled
    }
  }

  /**
   * The tracks, ready to play: the station's address for each one, and the art
   * this package holds for it. `refresh` skips the cache, which is what the
   * card's own reload asks for.
   */
  async function get(refresh) {
    const now = Date.now()
    if (!refresh && cached !== null && now - fetchedAt < PLAYLIST_TTL) return cached
    if (inFlight !== null) return inFlight
    inFlight = (async function () {
      const playlist = await readPlaylist()
      // Read once, before the loop: every track wears the same picture, so
      // there is nothing per-track to resolve.
      const art = await logoDataUrl()
      const tracks = playlist.tracks.map((track) => ({
        title: track.title,
        artist: track.artist,
        file: track.file,
        url: TRACKS_DIR + encodeURIComponent(track.file),
        art: art,
        explicit: track.explicit,
      }))
      cached = { station: playlist.station, name: playlist.name, tracks: tracks }
      fetchedAt = Date.now()
      console.log('omaseek: serving ' + tracks.length + ' tracks from ' + playlist.name)
      return cached
    })()
    try {
      return await inFlight
    } finally {
      inFlight = null
    }
  }

  return { get: get, logoDataUrl: logoDataUrl }
}

/**
 * The station, in one answer: every track with its address and its art. This
 * is what the card builds its transport around.
 */
function registerTracksRoute(ctx, catalog) {
  ctx.effect(function () {
    return ctx.connection.fetch.register({
      path: '/api/omaseek.music.tracks',
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async function (request) {
        try {
          const refresh = new URL(request.url).searchParams.get('refresh') !== null
          const list = await catalog.get(refresh)
          // The card's own reload wants the station as it is now, so a refresh
          // is answered from no cache at all — in either direction.
          const headers = { 'cache-control': refresh ? 'no-store' : 'private, max-age=60' }
          return Response.json(list, { headers: headers })
        } catch (error) {
          const message = String((error && error.message) || error)
          console.error('omaseek: music tracks failed — ' + message)
          return Response.json({ error: message }, { status: 500 })
        }
      },
    })
  }, 'omaseek: music tracks route')
}
