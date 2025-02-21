import { constant, isSignal, toReadableSignal } from "../signal/signal.js"

/**
 * @template {import("./types.js").ComponentInputDefinition} I
 * @template {Record<string, unknown>} C
 * @param {import("./types.js").Controller<I, C>} controller
 * @returns {import("./types.js").Component<I, C>}
 */
export function controller(controllerFn) {
  /**
   * @param {*} input
   */
  return ({ props, events }) => {
    const context = controllerFn({
      get props() {
        return proxifyProps(props)
      },
      get events() {
        return proxifyEvents(events)
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
function proxifyProps(input) {
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

/**
 *
 * @param {*} input
 * @return {*}
 */
function proxifyEvents(input) {
  return new Proxy(input, {
    get(target, prop) {
      if (prop in target) {
        const value = target[String(prop)]
        if (typeof value === "function") return value
      }
      return () => {}
    }
  })
}
