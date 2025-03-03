/**
@import { ResolvedHtmlyConfig, HtmlyConfig } from "./types.js"
*/
import process from "node:process"
import { assert } from "../util/assert.js"

/** @type {ResolvedHtmlyConfig} */
export const defaults = {
  get cwd() {
    return process.cwd()
  },
  namespaces: {
    app: {
      scanDir: "./src"
    }
  }
}

const ROOTS = Object.keys(defaults)
const NAMESPACE = Object.keys(defaults.namespaces.app)

/**
 *
 * @param {HtmlyConfig} config
 */
export function defineConfig(config) {
  validateConfig(config)
  return config
}

/**
 *
 * @param {unknown} config
 * @returns {config is HtmlyConfig}
 */
export function isHtmlyConfig(config) {
  return config !== null && typeof config === "object"
}

/**
 * @param {HtmlyConfig} config
 * @returns {asserts config is ResolvedHtmlyConfig}
 */
export function validateConfig(config) {
  const roots = Object.keys(config).filter(key => !ROOTS.includes(key))
  /** @type {string[]} */
  const namespaces = []
  for (const [prefix, namespace] of Object.entries(config.namespaces ?? {})) {
    namespaces.push(
      ...Object.keys(namespace)
        .filter(key => !NAMESPACE.includes(key))
        .map(key => `"namespaces.${prefix}.${key}`)
    )
  }

  const errors = [...roots, ...namespaces].join(", ")
  assert(errors.length === 0, `Invalid htmly config entries: ${errors}`)
}
