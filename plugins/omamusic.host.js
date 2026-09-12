/**
 * OmaMusic — the Omarchy site's music card as a floating Player. Host half.
 *
 * Serves the three files the site ships for its house track — the MP3, the
 * album art, and the analysed spectrum timeline — to this Package's Client
 * half over Package-private RPC. The MP3 crosses as base64 windows through
 * `fs.readByteRange`, so neither side ever buffers the whole file in one
 * call; the Client stitches the windows into a Blob and plays from memory.
 * No server, no route: the bytes ride the same JSON channel as everything
 * else.
 *
 * Plain JavaScript only (no import/require/TS). `fs` is an optional Service.
 */

/** The single track, exactly as omarchy.org ships it on its home page. */
var MUSIC_DIR = './references/omarchy-site/public/music'
var TRACK = {
  title: 'We Can Fix Everything (The Ultimate Machine)',
  artist: 'Kevin Koontz',
  mp3: MUSIC_DIR + '/kevin_koontz-we_can_fix_everything.mp3',
  art: MUSIC_DIR + '/kevin_koontz-we_can_fix_everything.webp',
  timeline: './references/omarchy-site/src/data/track.json',
}

/** Max bytes per `omamusic.chunk` window. */
var CHUNK_MAX = 1 << 20

var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/**
 * base64 for bytes. The Host `btoa` takes a string and would UTF-8 anything
 * above 0x7F, so MP3 bytes need this hand-rolled encoder instead.
 */
function b64(bytes) {
  var out = []
  for (var i = 0; i < bytes.length; i += 3) {
    var a = bytes[i]
    var b = i + 1 < bytes.length ? bytes[i + 1] : -1
    var c = i + 2 < bytes.length ? bytes[i + 2] : -1
    out.push(B64.charAt(a >> 2))
    out.push(B64.charAt(b < 0 ? 0 : ((a & 3) << 4) | (b >> 4)))
    out.push(b < 0 ? '=' : B64.charAt(c < 0 ? (b & 15) << 2 : ((b & 15) << 2) | (c >> 6)))
    out.push(c < 0 ? '=' : B64.charAt(c & 63))
  }
  return out.join('')
}

return {
  apply(ctx) {
    var meta = null
    ctx.effect(function () {
      function fileSystem() {
        var fs = ctx.get('fs')
        if (fs === undefined) throw new Error('the "fs" Service is not available on this Host')
        return fs
      }

      // One round trip for everything small: what plays, its art, and the
      // timeline that keeps the picture moving before the sound is on.
      harness.handle('omamusic.meta', async function () {
        if (meta !== null) return meta
        var fs = fileSystem()
        var artTarget = await fs.resolve(TRACK.art)
        var mp3Target = await fs.resolve(TRACK.mp3)
        var timelineTarget = await fs.resolve(TRACK.timeline)
        var info = await fs.stat(mp3Target)
        var artBytes = await fs.readBytes(artTarget, undefined, 1 << 20)
        var timeline = JSON.parse(await fs.readText(timelineTarget))
        meta = {
          title: TRACK.title,
          artist: TRACK.artist,
          size: info !== undefined && typeof info.size === 'number' ? info.size : 0,
          art: 'data:image/webp;base64,' + b64(artBytes),
          timeline: timeline,
        }
        console.log('omamusic: served track meta, ' + meta.size + ' bytes of mp3')
        return meta
      })

      // The MP3 in windows: [offset, offset + length), base64.
      harness.handle('omamusic.chunk', async function (args) {
        var offset = Number(args && args.offset)
        var length = Number(args && args.length)
        if (!Number.isInteger(offset) || offset < 0) throw new Error('bad chunk offset')
        if (!Number.isInteger(length) || length <= 0 || length > CHUNK_MAX) length = CHUNK_MAX
        var fs = fileSystem()
        var target = await fs.resolve(TRACK.mp3)
        var bytes = await fs.readByteRange(target, { offset: offset, length: length })
        return { offset: offset, data: b64(bytes) }
      })
    }, 'omamusic: track RPC')
  },
}
