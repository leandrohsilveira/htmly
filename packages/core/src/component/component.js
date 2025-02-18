import {
  constant,
  isReadableSignal,
  isSignal,
  toReadableSignal
} from "../signal/signal.js"

/**
 * @template {Record<string, unknown>} P
 * @template {Record<string, unknown>} C
 * @param {import("./types.js").Controller<P, C>} controller
 * @returns {import("./types.js").Component<P, C>}
 */
export function component(controller) {
  return props => {
    const context = controller({
      get props() {
        return proxify(props)
      }
    })

    return context
  }
}

/**
 *
 * @param {*} input
 * @return {*}
 */
function proxify(input) {
  return new Proxy(input, {
    get(target, prop) {
      if (prop in target) {
        const value = target[String(prop)]
        if (isSignal(value)) return toReadableSignal(value)
        if (typeof value === "function") return value
        return constant(value)
      }
      return constant(undefined)
    }
  })
}
