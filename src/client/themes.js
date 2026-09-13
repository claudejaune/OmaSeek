/**
 * OmaSeek — Omarchy home-page themes for DeepSeek Harness. Client half.
 *
 * Registers all 22 Omarchy home-page themes with the `theme` Service, then
 * contributes a Settings page listing only the themes belonging to the color
 * scheme currently in force — the five light palettes while the app is light,
 * the seventeen dark ones while it is dark. That filtering is the whole
 * design: a registered theme declares exactly one `colorScheme`, so a dark
 * palette is never offered over a light UI. The page also switches corner
 * shape, and Square is on from the moment the Plugin loads. The New Session
 * hero phrase and its pixel field are OmaPixel's, not this Plugin's.
 *
 * The palettes themselves arrive from this package's Node half over
 * `/api/omaseek.themes`, which parses them out of the research doc; only the
 * derived tokens are computed here.
 *
 * Plain JavaScript ESM, because `build/bundle-client.mjs` rewrites it into the
 * page's closure factory: `react` comes off the module table the shell seeds,
 * and every other module is relative to this directory. No JSX.
 */

import React from 'react'
import { mix } from './color.js'
import { fetchJson, insertSheet } from './dom.js'
import { createNotifier, h } from './ui.js'

/** Token this theme paints the user (and steering) bubble with. */
var BUBBLE = '--dsw-specific-bubble'

/**
 * Expand one 15-color research palette into the token map `theme.register`
 * consumes. A registered theme declares a single color scheme, so every token
 * is a plain value — the `{ light, dark }` pair form is only for override
 * layers, which this Plugin does not need.
 */
function tokensFor(p) {
  var tokens = {}
  // The 13 native tokens (Theme.listTokens), per the §7.2 mapping.
  tokens['--dsw-alias-bg-base'] = p.bg
  tokens['--dsw-alias-bg-layer-1'] = p.bgDeep
  tokens['--dsw-alias-bg-layer-2'] = p.surface2
  tokens['--dsw-alias-bg-overlay'] = p.surface
  tokens['--dsw-alias-border-l1'] = p.borderSubtle
  tokens['--dsw-alias-border-l2'] = p.borderStrong
  tokens['--dsw-alias-brand-primary'] = p.brand
  tokens['--dsw-alias-label-primary'] = p.text
  tokens['--dsw-alias-label-secondary'] = p.textSecondary
  tokens['--dsw-alias-state-error-primary'] = p.error
  tokens['--dsw-alias-state-success-primary'] = p.success
  tokens['--dsw-alias-state-warn-primary'] = p.warn
  tokens['--dsw-specific-sidebar-fill'] = p.bgDeep
  // design-platform tokens outside the native 13. The presenter writes every
  // key of a registered theme onto `body`, so these land like the native ones.
  tokens['--dsw-alias-label-tertiary'] = p.textMuted
  tokens['--dsw-alias-label-caption'] = p.textMuted
  tokens['--dsw-alias-link'] = p.brand
  tokens['--dsw-alias-button-primary-hover'] = mix(p.brand, p.text, 0.14)
  tokens['--dsw-alias-markdown-code-block'] = p.bgDeep
  tokens['--dsw-alias-markdown-inline-code'] = p.surface2
  tokens[BUBBLE] = mix(p.bg, p.brand, 0.1215)
  tokens['--dsw-specific-bubble-highlight'] = mix(p.bg, p.brand, 0.3)
  tokens['--dsw-specific-input-major'] = p.fieldBg
  tokens['--dsw-specific-login-input'] = p.fieldBg
  tokens['--dsw-specific-menu'] = p.surface
  tokens['--dsw-specific-selector'] = p.surface2
  tokens['--dsw-specific-tip'] = p.surface2
  // Omarchy picks an ink per brand (§4.1 On-brand text) so glyphs on brand
  // fills read on every palette; the send/stop sheet paints with it.
  tokens['--dsw-specific-brand-ink'] = p.brandInk
  // Sidebar interaction states are stepped off the sidebar fill itself, so
  // hover/active stay visible on themes where the layers share one color.
  var sidebar = p.bgDeep
  tokens['--dsw-specific-sidebar-nav-item-hover'] = mix(sidebar, p.text, 0.08)
  tokens['--dsw-specific-sidebar-nav-item-active'] = mix(sidebar, p.text, 0.15)
  tokens['--dsw-specific-sidebar-nav-item-active-accent'] = mix(sidebar, p.brand, 0.22)
  return tokens
}

/**
 * Corner-shape sheets, the Omarchy half of the look.
 *
 * DeepSeek Harness has no radius token — every component hard-codes its own
 * `border-radius`. But it *does* route corner shape through one token:
 * `ui-theme`'s `corner-shape.css` declares
 * `* { corner-shape: var(--dsw-corner-shape) }` at `superellipse(1.5)` —
 * a squircle. Two modes, one sheet:
 *
 * - `squircle` — the harness default, so no sheet is inserted at all.
 * - `square`   — `superellipse(infinity)`, a 90-degree corner whatever the
 *   radius, forced through every control with `!important`: the composer,
 *   bubbles, buttons and cards all get right angles, and so do the pills, the
 *   Switch capsule and the avatars that opt out with `corner-shape: round`.
 *
 * `corner-shape` is Chrome/Edge 139+; the guard leaves other engines exactly
 * as they were, and `.omaseek-warn` surfaces that rather than silently
 * doing nothing.
 */
var CORNER_SHEET = {
  square: '@supports (corner-shape: square){*,*::before,*::after{corner-shape:square!important}}',
}

var CORNER_LABELS = { squircle: 'Squircle', square: 'Square' }

/**
 * Where a scheme's remembered palette lives.
 *
 * `theme.setTheme()` persists only the harness's own `light`/`dark`/`system`
 * preference, so an Omarchy palette would be forgotten by every reload. The
 * picker keeps its own note instead: one slot per scheme, because the two are
 * never both in force — a dark palette is only ever offered over a dark UI.
 */
var STORAGE_KEY = 'omaseek.themes'

/**
 * What a scheme paints with when nobody has chosen one: the pair Omarchy itself
 * opens on. A light UI gets Catppuccin Latte, a dark one gets Catppuccin.
 */
var AUTOMATIC = { light: 'omarchy-catppuccin-latte', dark: 'omarchy-catppuccin' }

/** A scheme's slot when the reader asked for the harness's own palette. */
var HARNESS = 'base'

var CSS = [
  '.omaseek{display:flex;flex-direction:column;gap:20px;max-width:1000px}',
  '.omaseek-title{font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary)}',
  '.omaseek-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
  '.omaseek-chip{font:inherit;font-size:12px;padding:4px 12px;border-radius:999px;cursor:pointer;',
  'border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary)}',
  '.omaseek-chip:hover{background:var(--dsw-alias-bg-layer-2)}',
  '.omaseek-chip[data-on="1"]{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);border-color:transparent}',
  '.omaseek-legend{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary)}',
  '.omaseek-count{font-size:11px;color:var(--dsw-alias-label-tertiary)}',
  '.omaseek-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:14px}',
  '.omaseek-card{position:relative;display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:12px;',
  'border:1px solid transparent;background:transparent;cursor:pointer;text-align:left;font:inherit}',
  '.omaseek-card:hover{background:var(--dsw-alias-bg-layer-2)}',
  '.omaseek-card[data-on="1"]{border-color:var(--dsw-alias-brand-primary)}',
  '.omaseek-view{display:flex;height:66px;border-radius:8px;overflow:hidden;border:1px solid var(--dsw-alias-border-l1)}',
  '.omaseek-rail{width:34%;display:flex;flex-direction:column;gap:4px;padding:7px}',
  '.omaseek-pip{height:4px;border-radius:2px;opacity:.5}',
  '.omaseek-pip[data-on="1"]{opacity:1}',
  '.omaseek-body{flex:1;display:flex;flex-direction:column;gap:5px;padding:7px}',
  '.omaseek-line{height:4px;border-radius:2px}',
  '.omaseek-bubble{height:11px;width:62%;border-radius:6px;margin-top:auto;align-self:flex-end}',
  '.omaseek-cta{position:absolute;right:14px;bottom:44px;width:9px;height:9px;border-radius:999px}',
  '.omaseek-name{display:flex;justify-content:space-between;align-items:baseline;gap:6px;font-size:12px;',
  'color:var(--dsw-alias-label-primary)}',
  '.omaseek-tag{font-size:10px;color:var(--dsw-alias-label-tertiary)}',
  '.omaseek-warn{display:none;font-size:11px;line-height:1.6;color:var(--dsw-alias-state-warn-primary);max-width:62ch}',
  '.omaseek-error{font-size:12px;line-height:1.5;padding:10px 12px;border-radius:8px;white-space:pre-wrap;',
  'border:1px solid var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}',
  // Feature test in CSS: the Client half has no `document` to ask, so the
  // warning is hidden here and revealed only where corner-shape is missing.
  '@supports not (corner-shape: square){.omaseek-warn{display:block}}',
  // Send and stop — the site's "Get Omarchy" button scheme: brand fill,
  // brand ink glyph, hover 14 % whiter in oklch (button.tsx default variant).
  // They share the InputBar module's single `primary` class (KFmeWW_primary);
  // the hash-qualified fragment keeps the hit exact in this build — update
  // it if a harness rebuild renames the module.
  //
  // The ink falls back to the app background, never to white: `brand-ink` is a
  // token only these themes define, and the harness's own dark palette paints
  // brand as near-white — so a white fallback would leave the primary action
  // invisible for anyone who has not picked an Omarchy palette.
  'button[class*="KFmeWW_primary"]{background:var(--dsw-alias-brand-primary);',
  'color:var(--dsw-specific-brand-ink,var(--dsw-alias-bg-base))}',
  'button[class*="KFmeWW_primary"]:hover:not(:disabled){',
  'background:color-mix(in oklch, var(--dsw-alias-brand-primary), white 14%)}',
].join('\n')

export function applyFeature(host) {
  // The feature attaches when its services exist: the page's plugin tree is
  // still assembling while this apply runs, so a plain `ctx.get` here would
  // read an empty tree and the section would never appear.
  host.inject(['theme', 'slots'], function (ctx) {
  var theme = ctx.get('theme')
  var slots = ctx.get('slots')
  if (theme === undefined || slots === undefined) return

  // Package-local store: the palettes arrive asynchronously from the Host,
  // and the Settings page subscribes instead of polling.
  var state = { entries: [], error: '', loading: true, corners: 'square' }
  var notifier = createNotifier()
  var notify = notifier.notify
  var subscribe = notifier.subscribe

  /** `{ light: id | 'base', dark: … }` — a missing slot means "automatic". */
  var choices = loadChoices()

  function loadChoices() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw === null) return {}
      var parsed = JSON.parse(raw)
      return parsed !== null && typeof parsed === 'object' ? parsed : {}
    } catch (unavailable) {
      // Private mode, or storage denied: the picker still works for this page,
      // it just cannot remember across reloads.
      return {}
    }
  }

  function saveChoices() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choices))
    } catch (unavailable) {
      // Same as above: a preference that cannot be written is not an error.
    }
  }

  /** The id this scheme should be painting with, or null to leave it alone. */
  function wantedFor(scheme) {
    var chosen = choices[scheme]
    if (chosen === HARNESS) return null
    if (typeof chosen === 'string' && chosen !== '') return chosen
    return AUTOMATIC[scheme] === undefined ? null : AUTOMATIC[scheme]
  }

  /**
   * Put the scheme's palette in force. Called when the palettes arrive, when
   * the scheme flips, and never in a loop: applying what is already active is
   * the one case that returns early, and `setTheme` is what fires the change
   * this listens for.
   */
  function applyForScheme() {
    if (state.loading || state.error !== '') return
    var snapshot = theme.getTheme()
    var scheme = snapshot.active.colorScheme
    var wanted = wantedFor(scheme)
    if (wanted === null || wanted === snapshot.active.id) return
    // Only a palette this package registered: ids come from the research doc,
    // and a doc that dropped one should leave the harness palette rather than
    // throw inside a theme-change listener.
    var known = false
    for (var i = 0; i < state.entries.length; i += 1) {
      if (state.entries[i].id === wanted) known = true
    }
    if (!known) return
    try {
      theme.setTheme(wanted)
    } catch (error) {
      state.error = String((error && error.message) || error)
      notify()
    }
  }

  // Corner shape lives outside the Settings page: it restyles the whole
  // harness, so it stays applied after the page closes. One owned sheet,
  // swapped rather than stacked.
  var cornerOff = null
  function setCorners(mode) {
    if (cornerOff !== null) { cornerOff(); cornerOff = null }
    state.corners = mode
    if (CORNER_SHEET[mode] !== undefined) cornerOff = insertSheet(CORNER_SHEET[mode], 'omaseek:corners')
    notify()
  }
  // The Omarchy reading is the default: square the moment the Plugin loads.
  setCorners(state.corners)

  ctx.effect(function () { return insertSheet(CSS, 'omaseek:base') }, 'omaseek: styles')
  ctx.effect(function () {
    // The style tags go with the run anyway; this disposes the corner sheet
    // on its own too, so an update that never set a corner mode is clean.
    return function () { if (cornerOff !== null) cornerOff() }
  }, 'omaseek: corner sheet')

  ctx.effect(function () {
    var live = true
    var disposers = []
    fetchJson('/api/omaseek.themes').then(function (result) {
      var themes = (result && result.themes) || []
      var entries = []
      try {
        for (var i = 0; i < themes.length; i += 1) {
          var raw = themes[i]
          var id = 'omarchy-' + raw.id
          var tokens = tokensFor(raw.palette)
          if (!live) return
          disposers.push(theme.register({ id: id, colorScheme: raw.scheme, tokens: tokens }))
          entries.push({ id: id, name: raw.name, scheme: raw.scheme, tokens: tokens })
        }
      } catch (registerError) {
        // A throw mid-loop leaves the earlier registrations owned by this
        // effect, so stopping still cleans them up.
        state.error = String((registerError && registerError.message) || registerError)
        state.loading = false
        notify()
        return
      }
      state.entries = entries.sort(function (a, b) { return a.name.localeCompare(b.name) })
      state.error = ''
      state.loading = false
      applyForScheme()
      notify()
    }, function (error) {
      if (!live) return
      state.error = String((error && error.message) || error)
      state.loading = false
      notify()
    })
    return function () {
      live = false
      // Disposing the theme that backs the active preference resets it, so
      // stopping this Package can never leave the UI on a dead palette.
      for (var i = disposers.length - 1; i >= 0; i -= 1) disposers[i]()
    }
  }, 'omaseek: theme registry')

  ctx.effect(function () {
    // Light and dark each remember a palette, so the scheme decides which one
    // is in force — a click on Light is not a request to forget the dark pick.
    return ctx.on('theme/change', function () { applyForScheme() })
  }, 'omaseek: scheme palette')

  /** One theme card: a miniature of the palette, painted with its own tokens. */
  function Swatch(props) {
    var t = props.tokens
    return h('div', { className: 'omaseek-view', style: { background: t['--dsw-alias-bg-base'] } },
      h('div', { className: 'omaseek-rail', style: { background: t['--dsw-specific-sidebar-fill'] } },
        h('div', { className: 'omaseek-pip', style: { background: t['--dsw-alias-label-secondary'] } }),
        h('div', { className: 'omaseek-pip', 'data-on': '1', style: { background: t['--dsw-specific-sidebar-nav-item-active'] } }),
        h('div', { className: 'omaseek-pip', style: { background: t['--dsw-alias-label-secondary'] } })),
      h('div', { className: 'omaseek-body' },
        h('div', { className: 'omaseek-line', style: { background: t['--dsw-alias-label-primary'], width: '80%' } }),
        h('div', { className: 'omaseek-line', style: { background: t['--dsw-alias-label-secondary'], width: '56%' } }),
        h('div', { className: 'omaseek-bubble', style: { background: t[BUBBLE] } })),
      h('div', { className: 'omaseek-cta', style: { background: t['--dsw-alias-brand-primary'] } }))
  }

  function ThemePage() {
    var tick = React.useState(0)
    // Functional update: the subscription outlives the render that created it.
    var bump = function () { tick[1](function (n) { return n + 1 }) }
    React.useEffect(function () {
      var off = subscribe(bump)
      var offTheme = ctx.on('theme/change', bump)
      return function () { off(); offTheme() }
    }, [])

    var snapshot = theme.getTheme()
    // The filter rule: registered themes carry exactly one colorScheme, so
    // the list follows whatever scheme the presenter is currently painting.
    var scheme = snapshot.active.colorScheme
    var listed = state.entries.filter(function (entry) { return entry.scheme === scheme })

    function choose(entry) {
      // Remembered against its own scheme: a light pick is not a statement
      // about what a dark UI should wear.
      choices[entry.scheme] = entry.id
      saveChoices()
      try { theme.setTheme(entry.id) } catch (error) {
        state.error = String((error && error.message) || error)
        bump()
      }
    }

    // The harness's own palettes, always available. Picking Light or Dark is
    // also the opt-out for that scheme: it stops the automatic Catppuccin from
    // painting over the choice on the next scheme change. System forgets both
    // slots, which is how a reader gets back to automatic.
    function base(id) {
      if (id === 'system') {
        delete choices.light
        delete choices.dark
      } else {
        choices[id] = HARNESS
      }
      saveChoices()
      try { theme.setTheme(id) } catch (error) {
        state.error = String((error && error.message) || error)
        bump()
      }
    }

    var children = [
      h('div', { key: 'head' }, h('div', { className: 'omaseek-title' }, 'OmaSeek')),
    ]

    if (state.error !== '') {
      children.push(h('div', { key: 'err', className: 'omaseek-error' }, state.error))
    }

    children.push(h('div', { key: 'corners', className: 'omaseek-row' },
      h('span', { className: 'omaseek-legend' }, 'Corners'),
      ['squircle', 'square'].map(function (mode) {
        return h('button', {
          key: mode,
          className: 'omaseek-chip',
          type: 'button',
          'data-on': state.corners === mode ? '1' : '0',
          onClick: function () { setCorners(mode) },
        }, CORNER_LABELS[mode])
      })))

    // Purely a feature notice: hidden by the CSS, revealed only where
    // corner-shape is missing and the choice therefore does nothing.
    children.push(h('div', { key: 'corner-warn', className: 'omaseek-warn' },
      'This browser has no corner-shape (Chrome or Edge 139+), so the corner setting'
      + ' has no effect here. DeepSeek Harness ships the same guard for its own'
      + ' superellipse corners.'))

    children.push(h('div', { key: 'base', className: 'omaseek-row' },
      h('span', { className: 'omaseek-legend' }, 'Scheme'),
      h('button', { className: 'omaseek-chip', type: 'button', 'data-on': scheme === 'light' ? '1' : '0', onClick: function () { base('light') } }, 'Light'),
      h('button', { className: 'omaseek-chip', type: 'button', 'data-on': scheme === 'dark' ? '1' : '0', onClick: function () { base('dark') } }, 'Dark'),
      h('button', { className: 'omaseek-chip', type: 'button', 'data-on': snapshot.preference === 'system' ? '1' : '0', onClick: function () { base('system') } }, 'System')))

    children.push(h('div', { key: 'legend', className: 'omaseek-row' },
      h('span', { className: 'omaseek-legend' }, scheme === 'light' ? 'Light themes' : 'Dark themes'),
      h('span', { className: 'omaseek-count' }, state.loading
        ? 'loading palettes\u2026'
        : listed.length + ' of ' + state.entries.filter(function (entry) {
          return entry.scheme === scheme
        }).length + (choices[scheme] === undefined ? ' \u00b7 automatic' : ''))))

    children.push(h('div', { key: 'grid', className: 'omaseek-grid' },
      listed.map(function (entry) {
        return h('button', {
          key: entry.id,
          className: 'omaseek-card',
          type: 'button',
          'data-on': snapshot.active.id === entry.id ? '1' : '0',
          onClick: function () { choose(entry) },
        },
          h(Swatch, { tokens: entry.tokens }),
          h('div', { className: 'omaseek-name' },
            h('span', null, entry.name),
            snapshot.active.id === entry.id ? h('span', { className: 'omaseek-tag' }, 'active') : null))
      })))

    return h('div', { className: 'omaseek' }, children)
  }

  ctx.effect(function () {
    return slots.inject('settings.section', function () {
      return slots.register(
        { name: 'settings.section', id: 'omarchy-themes', order: 12, label: 'OmaSeek' },
        ThemePage,
      )
    })
  }, 'omaseek: settings page')
  })
}
