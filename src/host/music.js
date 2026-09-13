/**
 * OmaMusic — the Omarchy site's music card. Node half.
 *
 * Serves the three files the site ships for its house track — the MP3, the
 * album art, and the analysed spectrum timeline — to this package's browser
 * half over two Connection Fetch routes, plus the transport glyphs.
 *
 * Routing the bytes rather than the JSON window the dynamic Package used is
 * the reason this half exists at all: `/api/omaseek.music.chunk` answers a byte
 * range as `audio/mpeg`, so the browser half reads an `ArrayBuffer` and never
 * pays the base64 third it used to, and the carrier authenticates the request
 * before the plugin sees it.
 *
 * `fs` is an optional Service: a host that mounts one serves the files through
 * its own sandbox, and a host that does not gets the Node builtin reading the
 * copy sitting next to this module. Either way a missing track is a quiet
 * answer, not a boot failure — the card reports it.
 */
import { fileURLToPath } from 'node:url'
import { fileSize, readBytes, readText } from './files.js'

/** The plugin's own files, shipped beside this module. */
const MUSIC_DIR = new URL('../../assets/music/', import.meta.url)
const ICONS_URL = new URL('../../assets/icons/transport.json', import.meta.url)

/** The single track, exactly as omarchy.org ships it on its home page. */
const TRACK = {
  title: 'We Can Fix Everything (The Ultimate Machine)',
  artist: 'Kevin Koontz',
}

/** The mp3 this card plays. `OMASEEK_MUSIC_PATH` swaps in a track of your own. */
function trackPath() {
  const override = process.env.OMASEEK_MUSIC_PATH
  if (override !== undefined && override.trim() !== '') return override.trim()
  return fileURLToPath(new URL('kevin_koontz-we_can_fix_everything.mp3', MUSIC_DIR))
}

const ART_PATH = fileURLToPath(new URL('kevin_koontz-we_can_fix_everything.webp', MUSIC_DIR))
const TIMELINE_PATH = fileURLToPath(new URL('track.json', MUSIC_DIR))
const ICONS_PATH = fileURLToPath(ICONS_URL)

/** Max bytes one `music.chunk` request may ask for. */
const CHUNK_MAX = 1 << 20

/**
 * Register OmaMusic's routes on the browser connection.
 *
 * Both routes hang off `ctx.inject` rather than a guard: this apply runs while
 * the composition is still assembling, so `ctx.get('connection')` at that
 * moment reads an empty registry and neither route would ever appear. The
 * injected scope attaches them when a connection exists and disposes with the
 * fiber; a host with no browser half never runs the callback at all.
 */
export function registerMusicRoutes(host) {
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
    const path = trackPath()
    const size = await fileSize(ctx, path)
    if (size === 0) {
      console.error('omaseek: no music file at ' + path + ' — the card will stay silent')
      return { title: TRACK.title, artist: TRACK.artist, size: 0, art: '', timeline: null, icons: null }
    }
    if (heavy === null) {
      const artBytes = await readBytes(ctx, ART_PATH, undefined, 1 << 20)
      const timeline = JSON.parse(await readText(ctx, TIMELINE_PATH))
      // The transport glyphs travel with the meta. If the file went missing,
      // the browser half keeps its inlined copy of the same cells.
      let icons = null
      try {
        icons = JSON.parse(await readText(ctx, ICONS_PATH))
      } catch (missing) {
        console.error('omaseek: transport icons not found, using inlined cells')
      }
      heavy = {
        title: TRACK.title,
        artist: TRACK.artist,
        art: 'data:image/webp;base64,' + Buffer.from(artBytes).toString('base64'),
        timeline: timeline,
        icons: icons,
      }
      console.log('omaseek: serving "' + TRACK.title + '"')
    }
    return Object.assign({}, heavy, { size: size })
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
