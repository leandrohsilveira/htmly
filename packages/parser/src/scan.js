/**
@import {Namespaces, NamespaceOptions} from "@htmly/core/config"
@import {FoundComponentInfo, ComponentInfo, ScanOptions} from "./types.js"
 */
import path from "node:path"
import process from "node:process"
import { walk } from "./fs.js"
import { assert } from "@htmly/core"

export const TEMPLATE_REGEX = /component\.html$/
export const STYLE_REGEX = /component.(css|scss|sass|less|pcss)$/
export const CONTROLLER_REGEX = /component\.(js|ts|cjs|mjs|cts|mts)$/

/**
 *
 * @param {string} scanDir
 * @param {string | ((found: FoundComponentInfo) => string)} outputDir
 * @param {ScanOptions} [options]
 */
export async function scanComponents(scanDir, outputDir, options = {}) {
  const cwd = options.cwd ?? process.cwd()
  const root = path.resolve(cwd, scanDir)
  /** @type {Record<string, FoundComponentInfo>} */
  const found = {}

  for await (const currentPath of await walk(root)) {
    if (!isComponentFile(currentPath)) continue
    const { name, baseName } = componentName(root, currentPath, options)

    found[name] ??= { baseName }
    if (TEMPLATE_REGEX.test(currentPath)) found[name].template = currentPath
    if (CONTROLLER_REGEX.test(currentPath)) found[name].controller = currentPath
    if (STYLE_REGEX.test(currentPath)) found[name].styles = currentPath
  }

  const genCssScope = options.genCssScope ?? defaultGenCssScope

  /** @type {Record<string, ComponentInfo>} */
  const infos = {}
  for (const [name, info] of Object.entries(found)) {
    if (!info.template || !info.controller) continue
    const context =
      typeof outputDir === "string"
        ? path.resolve(cwd, outputDir)
        : outputDir(info)
    const component = path.resolve(context, `${name}.js`)
    infos[name] = {
      context,
      component,
      name,
      baseName: info.baseName,
      controller: info.controller,
      template: info.template,
      styles: info.styles,
      scope: info.styles ? genCssScope(name) : undefined
    }
  }

  return infos
}

/**
 *
 * @param {string} scanDir
 * @param {string} file
 * @param {ScanOptions} [options]
 * @returns
 */
function componentName(scanDir, file, options = {}) {
  const prefix = options.prefix ?? "app"
  const cwd = options.cwd ?? process.cwd()
  const root = path.resolve(cwd, scanDir)
  const relative = path.relative(root, file)
  const baseName = relative
    .replace(/[/\\]/g, "-")
    .replace(STYLE_REGEX, "")
    .replace(TEMPLATE_REGEX, "")
    .replace(CONTROLLER_REGEX, "")
    .replace(/[\.\-\_]$/, "")
  const name = baseName ? `${prefix}-${baseName}` : `${prefix}`
  return { name, baseName }
}

/**
 *
 * @param {string} scanDir
 * @param {string} file
 * @param {ScanOptions} [options]
 * @return {Promise<ComponentInfo | null>}
 */
export async function detectComponent(scanDir, file, options = {}) {
  if (isComponentFile(file)) {
    const context = path.dirname(file)
    const { name, baseName } = componentName(scanDir, file, options)

    /** @type {FoundComponentInfo} */
    const found = { baseName }

    for await (const currentPath of await walk(context, false)) {
      if (TEMPLATE_REGEX.test(currentPath)) found.template = currentPath
      if (CONTROLLER_REGEX.test(currentPath)) found.controller = currentPath
      if (STYLE_REGEX.test(currentPath)) found.styles = currentPath
    }

    if (found.template && found.controller) {
      const genCssScope = options.genCssScope ?? defaultGenCssScope

      const component = path.resolve(context, `${name}.js`)
      return {
        name,
        baseName,
        context,
        component,
        controller: found.controller,
        template: found.template,
        styles: found.styles,
        scope: found.styles ? genCssScope(name) : undefined
      }
    }
  }
  return null
}

/**
 *
 * @param {Namespaces} namespaces
 * @param {string} file
 * @param {string} [cwd]
 * @returns {[string, NamespaceOptions] | [null, null]}
 */
export function findNamespace(namespaces, file, cwd = process.cwd()) {
  if (!isComponentFile(file)) return [null, null]

  for (const [namespace, options] of Object.entries(namespaces)) {
    const scanDir = path.resolve(cwd, options.scanDir)
    if (path.matchesGlob(file, `${scanDir}/**`)) {
      return [namespace, options]
    }
  }

  return [null, null]
}

/**
 * @param {string} file
 * @returns {boolean}
 */
export function isComponentFile(file) {
  return (
    TEMPLATE_REGEX.test(file) ||
    STYLE_REGEX.test(file) ||
    CONTROLLER_REGEX.test(file)
  )
}

/**
 *
 * @param {Record<string, ComponentInfo>} source
 * @param {Record<string, ComponentInfo>} target
 */
export function mergeInfos(source, target) {
  const targets = Object.keys(target)
  const result = { ...target }
  for (const [name, info] of Object.entries(source)) {
    assert(!targets.includes(name), `Component "${name}" already exists`)
    result[name] = info
  }
  return result
}

/**
 *
 * @param {string} name
 * @returns {string}
 */
function defaultGenCssScope(name) {
  return `_${name}_`
}
