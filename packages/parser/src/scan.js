import process from "node:process"
import { walk } from "./fs.js"
import path from "node:path"

const COMPONENT_REGEX =
  /component\.(html|js|ts|cjs|mjs|cts|mts|css|scss|sass|less|pcss)/

/**
 *
 * @param {string} scanDir
 * @param {string} outputDir
 * @param {import("./types.js").ScanOptions} [options]
 */
export async function scanComponents(scanDir, outputDir, options = {}) {
  const prefix = options.prefix ?? "app"
  const cwd = options.cwd ?? process.cwd()
  const out = path.resolve(cwd, outputDir)
  const root = path.resolve(cwd, scanDir)
  /** @type {Record<string, import("./types.js").FoundComponentInfo>} */
  const found = {}
  for await (const currentPath of await walk(root)) {
    if (!COMPONENT_REGEX.test(currentPath)) continue
    const relative = path.relative(root, currentPath)
    const baseName = relative
      .replace(/[/\\]/g, "-")
      .replace(COMPONENT_REGEX, "")
      .replace(/\.$/, "")
    const name = `${prefix}-${baseName}`
    found[name] ??= {
      baseName
    }
    if (/\.html$/.test(relative)) found[name].template = currentPath
    if (/\.(js|ts|cjs|mjs|cts|mts)$/.test(relative))
      found[name].controller = currentPath
    if (/\.(css|scss|sass|less|pcss)$/.test(relative))
      found[name].styles = currentPath
  }

  /** @type {Record<string, import("./types.js").ComponentInfo>} */
  const infos = {}
  for (const [name, info] of Object.entries(found)) {
    if (!info.template || !info.controller) continue
    const component = path.resolve(out, `${name}.js`)
    infos[name] = {
      component,
      baseName: info.baseName,
      controller: info.controller,
      template: info.template,
      styles: info.styles
    }
  }

  return infos
}
