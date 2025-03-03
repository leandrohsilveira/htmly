/**
@import { ResolvedHtmlyConfig } from "@htmly/core/config"
@import { LoadConfigOptions } from "./types.js"
*/
import { defaults, isHtmlyConfig, validateConfig } from "@htmly/core/config"
import process from "node:process"
import * as unconfig from "unconfig"

/**
 *
 * @param {LoadConfigOptions} [options]
 * @returns {Promise<unconfig.LoadConfigResult<ResolvedHtmlyConfig>>}
 */
export function loadConfig({
  path = "htmly.config",
  cwd = process.cwd()
} = {}) {
  return /** @type {typeof unconfig.loadConfig.async<ResolvedHtmlyConfig>} */ (
    unconfig.loadConfig.async
  )({
    cwd,
    defaults,
    sources: [
      {
        files: path,
        extensions: ["ts", "mts", "cts", "js", "mjs", "cjs", "json"]
      },
      {
        files: "package.json",
        extensions: [],

        /**
         * @param {*} config
         */
        rewrite(config) {
          if (typeof config !== "object") return undefined
          if (config === null) return undefined
          if (!("htmly" in config)) return undefined
          if (!isHtmlyConfig(config.htmly)) return undefined
          validateConfig(config.htmly)
          return config.htmly
        }
      }
    ],
    merge: false
  })
}
