/**
 * The two seams a browser half uses.
 *
 * A sheet goes in as a tagged `<style>` the plugin owns and removes, and a call
 * to this package's Node half goes over the same authenticated `/api/*` bridge
 * the shell uses for its own data.
 */

/**
 * Put one stylesheet in the document and hand back its remover.
 * Idempotent per `id`, so a remount never doubles a sheet; the remover only
 * takes the tag away once the last feature using that id is gone.
 * @param css - the sheet's text.
 * @param id - a stable id namespaced under `omaseek`.
 * @returns disposer taking the sheet back out.
 */
export function insertSheet(css, id) {
  const selector = `style[data-omaseek=${JSON.stringify(id)}]`
  const existing = document.querySelector(selector)
  if (existing !== null) {
    existing.dataset.omaseekUsers = String(Number(existing.dataset.omaseekUsers || '1') + 1)
    return removerFor(existing)
  }
  const tag = document.createElement('style')
  tag.dataset.omaseek = id
  tag.dataset.omaseekUsers = '1'
  tag.textContent = css
  document.head.appendChild(tag)
  return removerFor(tag)
}

/**
 * One remover shape for every owner, first or last: whoever leaves decrements
 * the count, and the tag goes only when the count reaches zero. (Giving the
 * first owner a plain `remove()` let a live second owner's sheet vanish under
 * it — a single duplicate row or a reused id away from a blank section.)
 */
function removerFor(tag) {
  return function () {
    const left = Number(tag.dataset.omaseekUsers || '1') - 1
    if (left > 0) {
      tag.dataset.omaseekUsers = String(left)
      return
    }
    tag.remove()
  }
}

/**
 * Ask this package's Node half for JSON over the Connection Fetch bridge.
 * The route is authenticated by the carrier before it reaches the plugin, so
 * this is an ordinary same-origin fetch — no token, no channel bookkeeping.
 * @param path - a `/api/omaseek.*` route registered by the host half.
 * @returns the parsed body.
 */
export async function fetchJson(path) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`omaseek: ${path} responded ${response.status}`)
  return await response.json()
}
