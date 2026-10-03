/**
 * The one place this package touches the machine's files.
 *
 * The `fs` Service is tried first because a host that mounts one serves paths
 * through the execution world's policy; the Node builtin is only a fallback for
 * the case the service was never meant to answer — a file that is not there.
 *
 * That distinction is the point of this module. Falling back on *every* service
 * error would quietly step around the policy a host mounted the service to
 * enforce: a sandbox denial or a permission refusal would be retried with full
 * Node access, and the confinement would mean nothing. So only the "no such
 * file" codes fall through, and anything else is rethrown to the caller, which
 * reports it.
 */
import { open, readFile, readdir, stat } from 'node:fs/promises'

/** Service/builtin codes that mean "this host has no such file". */
const MISSING = new Set(['FS_NOT_FOUND', 'FS_NOT_REGULAR_FILE', 'ENOENT', 'ENOTDIR'])

/** Whether the Node builtin may answer where the `fs` Service refused. */
function mayFallBack(error) {
  const code = error === null || error === undefined ? undefined : error.code
  return code !== undefined && MISSING.has(code)
}

/** Read a whole text file. */
export async function readText(ctx, path) {
  const fileSystem = ctx.get('fs')
  if (fileSystem !== undefined) {
    try {
      const target = await fileSystem.resolve(path)
      return await fileSystem.readText(target)
    } catch (error) {
      if (!mayFallBack(error)) throw error
    }
  }
  return await readFile(path, 'utf8')
}

/**
 * Read a byte range, or the whole file when `offset` is undefined.
 * The returned view is exactly the bytes read — never the pooled buffer's
 * slack, which would leak uninitialised memory into a response.
 */
export async function readBytes(ctx, path, offset, length) {
  const fileSystem = ctx.get('fs')
  if (fileSystem !== undefined) {
    try {
      const target = await fileSystem.resolve(path)
      if (offset === undefined) return await fileSystem.readBytes(target, undefined, length)
      return await fileSystem.readByteRange(target, { offset: offset, length: length })
    } catch (error) {
      if (!mayFallBack(error)) throw error
    }
  }
  const handle = await open(path, 'r')
  try {
    const buffer = Buffer.allocUnsafe(length)
    const read = await handle.read(buffer, 0, length, offset === undefined ? 0 : offset)
    return new Uint8Array(buffer.buffer, buffer.byteOffset, read.bytesRead)
  } finally {
    await handle.close()
  }
}

/** A file's size, or 0 when this host has no such file. */
export async function fileSize(ctx, path) {
  const fileSystem = ctx.get('fs')
  if (fileSystem !== undefined) {
    try {
      const target = await fileSystem.resolve(path)
      const info = await fileSystem.stat(target)
      if (info !== undefined && typeof info.size === 'number') return info.size
    } catch (error) {
      if (!mayFallBack(error)) throw error
    }
  }
  try {
    const info = await stat(path)
    return info.size
  } catch (missing) {
    return 0
  }
}

/**
 * One directory's direct children, or an empty list when it is not there.
 *
 * A directory that is not there is the ordinary answer rather than a failure:
 * the caller is asking what is installed, and a machine with nothing installed
 * has nothing to report. Every other refusal — a sandbox denial, a permission —
 * is rethrown, the way the reads above treat them, so a policy that keeps this
 * package out of a directory is visible rather than silent.
 *
 * A symlink is reported as a symlink rather than followed, because a theme
 * installed as one is a theme Omarchy lists and the caller has to decide.
 * @param ctx - host context, for the optional `fs` Service.
 * @param path - the directory to list.
 * @returns `[{ name, type, path }]` sorted by name.
 */
export async function listDirectory(ctx, path) {
  const children = []
  const fileSystem = ctx.get('fs')
  let listed = false

  if (fileSystem !== undefined) {
    try {
      const target = await fileSystem.resolve(path)
      for (const entry of await fileSystem.listDir(target)) {
        children.push({ name: entry.name, type: entry.type, path: path + '/' + entry.name })
      }
      listed = true
    } catch (error) {
      if (!mayFallBack(error)) throw error
    }
  }

  if (!listed) {
    try {
      for (const entry of await readdir(path, { withFileTypes: true })) {
        children.push({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : entry.isSymbolicLink() ? 'symlink' : 'other',
          path: path + '/' + entry.name,
        })
      }
    } catch (error) {
      const code = error === null || error === undefined ? undefined : error.code
      if (code === undefined || !MISSING.has(code)) throw error
    }
  }

  return children.sort(function (left, right) { return left.name.localeCompare(right.name) })
}
