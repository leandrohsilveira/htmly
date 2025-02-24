import { $f } from "../renderer/renderer.js"
import { constant, isSignal, toReadableSignal } from "../signal/signal.js"

/**
 * @param {*} param
 * @returns {*}
 */
export function proxifyInput({ props, events, slots = {} }) {
  return {
    get props() {
      return proxifyProps(props)
    },
    get events() {
      return proxifyEvents(events)
    },
    get slots() {
      return handleInputSlots(slots)
    }
  }
}

/**
 * @param {*} input
 * @returns {*}
 */
export function proxifySlots({ slots = {} }) {
  return new Proxy(slots, {
    get(target, prop) {
      if (prop in target) {
        const value = target[String(prop)]
        if (typeof value === "function") return value
        return () => value
      }
      return () => $f()
    }
  })
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

/**
 *
 * @param {*} slots
 * @returns {*}
 */
function handleInputSlots(slots) {
  if (!slots) return {}
  return Object.fromEntries(
    Object.entries(slots).map(([key, value]) => [
      key,
      value !== undefined && value !== null
    ])
  )
}
