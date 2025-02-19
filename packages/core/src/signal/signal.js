import {
  signal as _signal,
  computed as _computed,
  effect as _effect
} from "@preact/signals"

/**
 * @template T
 * @param {T} value
 * @returns {import("./types.js").Signal<T>}
 */
export function signal(value) {
  const src = _signal(value)
  const signal = () => src.value
  signal.set = set
  signal.signal = true
  return signal

  /**
   *
   * @param {T} newValue
   */
  function set(newValue) {
    src.value = newValue
  }
}

/**
 * @template T
 * @param {() => T} fn
 * @returns {import("./types.js").ReadableSignal<T>}
 */
export function computed(fn) {
  const src = _computed(fn)
  const res = () => src.value
  res.signal = true
  return res
}

/**
 * @param {() => (() => void) | void} fn
 */
export function effect(fn) {
  return _effect(fn)
}

/**
 * @template T
 * @param {unknown} value
 * @returns {value is import("./types.js").Signal<T>}
 */
export function isSignal(value) {
  return (
    typeof value === "function" && "signal" in value && value.signal === true
  )
}

/**
 * @template T
 * @param {unknown} value
 * @returns {value is import("./types.js").Constant<T>}
 */
export function isConstant(value) {
  return (
    typeof value === "function" &&
    "constant" in value &&
    value.constant === true
  )
}

/**
 * @template T
 * @param {import("./types.js").Signal<T>} value
 * @returns {import("./types.js").ReadableSignal<T>}
 */
export function toReadableSignal(value) {
  const signal = () => value()

  signal.signal = true

  return signal
}

/**
 * @template T
 * @param {T} value
 * @returns {import("./types.js").Constant<T>}
 */
export function constant(value) {
  const signal = () => value
  signal.constant = true
  return signal
}
