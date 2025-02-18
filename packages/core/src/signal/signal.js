/**
 * @template T
 * @param {unknown} value
 * @returns {value is import("./types.js").Signal<T>}
 */
export function isSignal(value) {
  return (
    typeof value === "function" &&
    ["bound signalGetterSetter", "bound computedGetter"].indexOf(value.name) >=
      0
  )
}

/**
 * @template T
 * @param {unknown} value
 * @returns {value is import("./types.js").ReadableSignal<T>}
 */
export function isReadableSignal(value) {
  return (
    (typeof value === "function" && value.name === "readableSignal") ||
    isSignal(value)
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
  return readableSignal

  function readableSignal() {
    return value()
  }
}

/**
 * @template T
 * @param {T} value
 * @returns {import("./types.js").ReadableSignal<T>}
 */
export function constant(value) {
  const signal = () => value
  signal.constant = true
  return signal
}
