/**
 * OmaMusic — the Omarchy site's music card. Node half.
 *
 * Serves the track this machine has — the MP3, and optionally its album art
 * and an analysed spectrum timeline — to this package's browser half over two
 * Connection Fetch routes.
 *
 * None of those files are distributed with the package: the track omarchy.org
 * plays is Kevin Koontz's, and it is not ours to ship. Point
 * `OMASEEK_MUSIC_PATH` at a file of your own instead; the art and timeline are
 * optional extras beside it.
 *
 * `/api/omaseek.music.chunk` answers a byte range as `audio/mpeg`, so the
 * browser half reads an `ArrayBuffer` and never pays a base64 third, and the
 * carrier authenticates the request before the plugin sees it.
 *
 * `fs` is an optional Service: a host that mounts one serves the files through
 * its own sandbox, and a host that does not gets the Node builtin reading the
 * copy sitting next to this module. Either way a missing track is a quiet
 * answer, not a boot failure — the card reports it.
 */
import { fileURLToPath } from 'node:url'
import { fileSize, readBytes, readText } from './files.js'

/** The cover art ships with the package. */
const ART_URL = new URL('../art/cover.webp', import.meta.url)

/** The single track, exactly as omarchy.org ships it on its home page. */
const TRACK = {
  title: 'We Can Fix Everything (The Ultimate Machine)',
  artist: 'Kevin Koontz',
}

/** The station that hosts the track, streamed from there rather than shipped. */
const RADIO_TRACK = 'https://radio.omarchy.org/tracks/'
  + 'kevin-koontz-we-can-fix-everything-the-ultimate-machine.mp3'

/** A setting, or nothing when it is unset or blank. */
function envValue(name) {
  const value = process.env[name]
  if (value === undefined || value.trim() === '') return undefined
  return value.trim()
}

/**
 * The track to stream. `OMASEEK_MUSIC_URL` points the card somewhere else; with
 * no setting it plays the station's own copy of this track.
 */
function trackUrl() {
  return envValue('OMASEEK_MUSIC_URL') === undefined ? RADIO_TRACK : envValue('OMASEEK_MUSIC_URL')
}

/**
 * A local file to play instead of streaming, when `OMASEEK_MUSIC_PATH` names
 * one. The card reads it in windows over the chunk route.
 */
function trackPath() {
  return envValue('OMASEEK_MUSIC_PATH')
}

/** The analysed spectrum, for a local file that has one beside it. */
function timelinePath() {
  const override = envValue('OMASEEK_MUSIC_TIMELINE')
  if (override !== undefined) return override
  const local = trackPath()
  if (local === undefined) return undefined
  return local.replace(/\.[^./\\]+$/, '') + '.json'
}

/** Max bytes one `music.chunk` request may ask for. */
const CHUNK_MAX = 1 << 20

/**
 * The plugin's entry point: register this package's routes on the browser
 * connection.
 *
 * Both routes hang off `ctx.inject` rather than a guard: this apply runs while
 * the composition is still assembling, so `ctx.get('connection')` at that
 * moment reads an empty registry and neither route would ever appear. The
 * injected scope attaches them when a connection exists and disposes with the
 * fiber; a host with no browser half never runs the callback at all.
 */
export function apply(host) {
  host.inject(['connection'], function (ctx) {
    registerMetaRoute(ctx)
    registerChunkRoute(ctx)
  })
}

/** One round trip for everything small: what plays, its art, its timeline. */
function registerMetaRoute(ctx) {
  /**
   * The heavy half — art, timeline, transport glyphs — read once, because it is
   * the shipped assets and cannot change under a running process.
   *
   * The size is deliberately *not* cached: it is one `stat` on the request
   * path, and caching it would let the meta and the chunk route disagree the
   * moment someone points `OMASEEK_MUSIC_PATH` at a file, or replaces one.
   * Nothing is cached for a missing track either, so dropping a file in place
   * is picked up by the next page load instead of needing a plugin reload.
   */
  let heavy = null

  async function metaOnce() {
    const local = trackPath()
    const size = local === undefined ? 0 : await fileSize(ctx, local)
    if (local !== undefined && size === 0) {
      console.error('omaseek: no music file at ' + local + ' — the card will say so')
      return { title: TRACK.title, artist: TRACK.artist, url: '', size: 0, art: '', timeline: null, icons: null }
    }
    if (heavy === null) {
      // Art is ours to ship; the timeline is an analysis of one particular file,
      // so it is optional and only read when there is a local file to match it.
      let art = ''
      try {
        const artBytes = await readBytes(ctx, fileURLToPath(ART_URL), undefined, 1 << 20)
        art = 'data:image/webp;base64,' + Buffer.from(artBytes).toString('base64')
      } catch (missing) {
        // No art: the card's ring pulses over an empty plate.
      }
      let timeline = null
      const analysis = timelinePath()
      if (analysis !== undefined) {
        try {
          timeline = JSON.parse(await readText(ctx, analysis))
        } catch (missing) {
          // No analysis: the meter reads the live audio instead of the timeline.
        }
      }
      heavy = {
        title: TRACK.title,
        artist: TRACK.artist,
        art: art,
        timeline: timeline,
        icons: null,
      }
      console.log('omaseek: serving "' + TRACK.title + '"')
    }
    // One of the two: a local file the chunk route feeds, or a URL the browser
    // streams from. Never both.
    const source = local === undefined
      ? { url: trackUrl(), size: 0 }
      : { url: '', size: size }
    return Object.assign({}, heavy, source)
  }

  ctx.effect(function () {
    return ctx.connection.fetch.register({
      path: '/api/omaseek.music.meta',
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async function () {
        try {
          return Response.json(await metaOnce(), { headers: { 'cache-control': 'no-store' } })
        } catch (error) {
          const message = String((error && error.message) || error)
          console.error('omaseek: music meta failed — ' + message)
          return Response.json({ error: message }, { status: 500 })
        }
      },
    })
  }, 'omaseek: music meta route')
}

/** The mp3 in windows: [offset, offset + length), as raw bytes. */
function registerChunkRoute(ctx) {
  ctx.effect(function () {
    return ctx.connection.fetch.register({
      path: '/api/omaseek.music.chunk',
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async function (request) {
        const query = new URL(request.url).searchParams
        // A missing or blank parameter is a malformed request, not offset 0:
        // `Number(null)` is 0, which would answer the first megabyte of the
        // track to a request that never asked for a window.
        const rawOffset = query.get('offset')
        const rawLength = query.get('length')
        const offset = Number(rawOffset)
        if (rawOffset === null || rawOffset.trim() === '' || !Number.isInteger(offset) || offset < 0) {
          return Response.json({ error: 'bad chunk offset' }, { status: 400 })
        }
        let length = Number(rawLength)
        if (rawLength === null || rawLength.trim() === ''
            || !Number.isInteger(length) || length <= 0 || length > CHUNK_MAX) {
          length = CHUNK_MAX
        }
        try {
          const bytes = await readBytes(ctx, trackPath(), offset, length)
          return new Response(bytes, {
            headers: { 'content-type': 'audio/mpeg', 'content-length': String(bytes.length) },
          })
        } catch (error) {
          const message = String((error && error.message) || error)
          return Response.json({ error: message }, { status: 404 })
        }
      },
    })
  }, 'omaseek: music chunk route')
}
