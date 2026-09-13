/**
 * The two seams every OmaSeek browser feature shares.
 *
 * A dynamic Cordis package gets `styles.insert(css)` and `host.call(method)`
 * handed to it by the evaluator. An installed package gets neither: its
 * browser half is a plain module in the page, and its Node half is a plain
 * plugin in the harness. So the sheet goes in the way the shipped plugins do
 * — a tagged `<style>` the plugin owns and removes — and the call goes over
 * the same authenticated `/api/*` bridge the shell uses for its own data.
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
    const count = Number(existing.dataset.omaseekUsers || '1') + 1
    existing.dataset.omaseekUsers = String(count)
    return function () {
      const left = Number(existing.dataset.omaseekUsers || '1') - 1
      if (left > 0) existing.dataset.omaseekUsers = String(left)
      else existing.remove()
    }
  }
  const tag = document.createElement('style')
  tag.dataset.omaseek = id
  tag.dataset.omaseekUsers = '1'
  tag.textContent = css
  document.head.appendChild(tag)
  return function () { tag.remove() }
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
