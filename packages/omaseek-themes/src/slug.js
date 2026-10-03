/**
 * The name Omarchy prints for a theme slug.
 *
 * `omarchy theme list` runs its directory names through
 * `sed -E 's/(^|-)([a-z])/\1\u\2/g; s/-/ /g'`, and that is how a reader
 * recognises a theme — "Catppuccin Latte", not "catppuccin-latte". Both halves
 * of this package need it: the Node half names the themes it finds on the
 * machine, and the browser half names themes it only ever saw go past on the
 * desktop. It lives on its own so the two cannot drift.
 * @param slug - a theme directory name.
 * @returns the name Omarchy would print for it.
 */
export function prettyName(slug) {
  return String(slug)
    .replace(/(^|-)([a-z])/g, function (match, lead, letter) { return lead + letter.toUpperCase() })
    .replace(/-/g, ' ')
}
