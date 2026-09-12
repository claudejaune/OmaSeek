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
 * hero swaps its headline for one of the four OmaSeek phrases, typed letter
 * by letter once per hero mount.
 *
 * The palettes themselves arrive from this Package's Host half, which parses
 * them out of the research doc; only the derived tokens are computed here.
 *
 * Plain JavaScript only (no import/require/JSX/TS).
 */

/** Token this theme paints the user (and steering) bubble with. */
var BUBBLE = '--dsw-specific-bubble'

/**
 * Blend two colors: `amount` of `to` over `from`, as `#rrggbb`.
 * Omarchy tints the user bubble with brand at 12.15 % over the app background;
 * the same math gives every derived surface below a consistent step.
 */
function mix(from, to, amount) {
  var a = toRgb(from), b = toRgb(to), out = '#'
  for (var i = 0; i < 3; i += 1) {
    var v = Math.round(a[i] + (b[i] - a[i]) * amount)
    var hex = v.toString(16)
    out += hex.length < 2 ? '0' + hex : hex
  }
  return out
}

var NAMED = { silver: 'c0c0c0', white: 'ffffff', black: '000000', gray: '808080', grey: '808080' }

/** Parse a hex or the handful of CSS names the source tables use. */
function toRgb(value) {
  var raw = String(value === undefined || value === null ? '' : value).trim().toLowerCase()
  if (NAMED[raw] !== undefined) raw = NAMED[raw]
  var hex = raw.charAt(0) === '#' ? raw.slice(1) : raw
  if (hex.length === 3) hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2)
  if (hex.length !== 6) return [128, 128, 128]
  var n = parseInt(hex, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Expand one 14-color research palette into the token map `theme.register`
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
 * The New Session hero's headline, replaced per Plugin load.
 *
 * The shipped headline is a plain `t('hero.headline')` span with no Slot of
 * its own, and its locale dictionary is single-occupant — so the sheet is
 * the surface: hide the shipped glyphs (`font-size: 0`) and let an `::after`
 * speak the chosen phrase, inheriting the headline's own
 * `--dsw-alias-label-primary`.
 *
 * The typing mirrors omarchy.org's `TypewriterTail` rhythm (≈58 ms a
 * keystroke plus jitter averages ~88 ms) but differs on purpose: every
 * letter of the phrase animates — not just a tail after a static prefix —
 * exactly once, then it stops. A `steps(len)` clip on the pseudo-element is
 * the one primitive that reveals left to right with no per-letter DOM, and
 * an absolutely positioned caret pseudo walks the same steps and then blinks
 * at the end, like the site's idle caret.
 */
var HERO_PHRASES = [
  'We can fix every paper cut',
  'We can fix everything.',
  'We can fix every missing app.',
  'We can fix every incompatibility.',
]

/** One hero sheet for one phrase: replacement always, typing when motion is fine. */
function heroSheet(phrase) {
  var len = phrase.length
  var ms = Math.round(len * 88)
  var start = 350
  // The shipped title span; the sibling badge is told apart by its class.
  var title = '[class*="titleGroup"] > span:not([class*="previewBadge"])'
  return [
    title + '{position:relative;font-size:0}',
    title + '::after{content:"' + phrase + '";display:inline-block;font-size:26px;line-height:32px;',
    'font-weight:500;white-space:pre-wrap;max-width:100%}',
    // px, not em: the host span sits at font-size 0, where em would vanish.
    '@media (prefers-reduced-motion: no-preference){',
    title + '::after{clip-path:inset(-0.1em 100% -0.2em 0);',
    'animation:omaseek-hero-type ' + ms + 'ms steps(' + len + ',end) ' + start + 'ms forwards}',
    title + '::before{content:"";position:absolute;left:0;top:50%;width:3px;height:28px;margin-top:-14px;',
    'background:var(--dsw-alias-brand-primary);',
    'animation:omaseek-hero-caret ' + ms + 'ms steps(' + len + ',end) ' + start + 'ms forwards,',
    'omaseek-hero-blink 1.06s step-end ' + (start + ms + 500) + 'ms infinite}',
    '}',
    // The overshoot past 0% keeps the last glyph's edge off the clip line.
    '@keyframes omaseek-hero-type{from{clip-path:inset(-0.1em 100% -0.2em 0)}to{clip-path:inset(-0.1em -1% -0.2em 0)}}',
    '@keyframes omaseek-hero-caret{from{left:0}to{left:100%}}',
    '@keyframes omaseek-hero-blink{0%,50%{opacity:1}50.01%,100%{opacity:0}}',
  ].join('\n')
}

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
].join('\n')

/** createElement shorthand — this Package is not compiled, so no JSX. */
function h(type, props) {
  var children = []
  for (var i = 2; i < arguments.length; i += 1) children.push(arguments[i])
  return React.createElement.apply(null, [type, props].concat(children))
}

return {
  apply(ctx) {
    var theme = ctx.get('theme')
    var slots = ctx.get('slots')
    if (theme === undefined || slots === undefined) return

    // Package-local store: the palettes arrive asynchronously from the Host,
    // and the Settings page subscribes instead of polling.
    var state = { entries: [], error: '', loading: true, corners: 'square' }
    var subs = []
    function notify() {
      for (var i = 0; i < subs.length; i += 1) subs[i]()
    }
    function subscribe(fn) {
      subs.push(fn)
      return function () {
        var at = subs.indexOf(fn)
        if (at >= 0) subs.splice(at, 1)
      }
    }

    // Corner shape lives outside the Settings page: it restyles the whole
    // harness, so it stays applied after the page closes. One owned sheet,
    // swapped rather than stacked.
    var cornerOff = null
    function setCorners(mode) {
      if (cornerOff !== null) { cornerOff(); cornerOff = null }
      state.corners = mode
      if (CORNER_SHEET[mode] !== undefined) cornerOff = styles.insert(CORNER_SHEET[mode])
      notify()
    }
    // The Omarchy reading is the default: square the moment the Plugin loads.
    setCorners(state.corners)

    ctx.effect(function () { return styles.insert(CSS) }, 'omaseek: styles')
    ctx.effect(function () {
      // One phrase per run, picked when the Plugin loads; the typing itself is
      // per hero mount, because the CSS animation restarts with the element.
      var phrase = HERO_PHRASES[Math.floor(Math.random() * HERO_PHRASES.length)]
      return styles.insert(heroSheet(phrase))
    }, 'omaseek: hero headline')
    ctx.effect(function () {
      // The style tags go with the run anyway; this disposes the corner sheet
      // on its own too, so an update that never set a corner mode is clean.
      return function () { if (cornerOff !== null) cornerOff() }
    }, 'omaseek: corner sheet')

    ctx.effect(function () {
      var live = true
      var disposers = []
      host.call('omaseek.themes').then(function (result) {
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
        try { theme.setTheme(entry.id) } catch (error) {
          state.error = String((error && error.message) || error)
          bump()
        }
      }
      // Leaving the Omarchy set: the built-in preferences are always available.
      function base(id) {
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
          : listed.length + (scheme === 'light' ? ' of 5' : ' of 17'))))

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
  },
}
