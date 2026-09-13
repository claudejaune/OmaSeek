/**
 * The two things every browser feature here builds with: `h`, and the listener
 * list behind each Settings page. A bundle cannot import from a sibling
 * package, so each package that needs them carries its own copy.
 */
import React from 'react'

/** createElement shorthand — this package is not compiled, so no JSX. */
export function h(type, props) {
  var children = []
  for (var i = 2; i < arguments.length; i += 1) children.push(arguments[i])
  return React.createElement.apply(null, [type, props].concat(children))
}

/**
 * A listener list with one broadcast, which is all three features need to make
 * a settings page follow state it does not own: the feature mutates its own
 * object and calls `notify()`, and every mounted page re-renders.
 * @returns `{ notify, subscribe }`; `subscribe` returns its own remover.
 */
export function createNotifier() {
  var subs = []
  return {
    notify: function () {
      for (var i = 0; i < subs.length; i += 1) subs[i]()
    },
    subscribe: function (fn) {
      subs.push(fn)
      return function () {
        var at = subs.indexOf(fn)
        if (at >= 0) subs.splice(at, 1)
      }
    },
  }
}
