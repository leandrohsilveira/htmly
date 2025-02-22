/**
@import {Plugin, ViteDevServer} from "vite"
@import {ComponentInfo} from "@htmly/parser"
 */
import { assert } from "@htmly/core"
import {
  detectComponent,
  isComponentFile,
  parseAst,
  scanComponents,
  transform
} from "@htmly/parser"
import { generate } from "escodegen"
import path from "node:path"

/**
 * @returns {Plugin}
 */
export function htmlyPlugin() {
  const scanDir = "./src"
  const ids = new Set()

  /** @type {Record<string, ComponentInfo>} */
  let infos

  /** @type {ViteDevServer} */
  let server

  return {
    name: "vite-plugin-htmly",
    enforce: "pre",
    async buildStart() {
      infos = await scanComponents(scanDir, info => {
        const context = info.template ?? info.controller ?? info.styles
        assert(
          context !== undefined,
          `Unable to determine context for ${info.baseName}`
        )
        return path.dirname(context)
      })
    },
    async resolveId(id, importer) {
      const resolved = await this.resolve(id, importer)
      if (
        resolved &&
        !resolved.external &&
        /component.html$/.test(id) &&
        importer
      ) {
        ids.add(resolved.id)
        return resolved
      }

      return null
    },
    async transform(src, id) {
      if (ids.has(id)) {
        assert(
          infos !== undefined,
          "Component info map should not be undefined at watchChange event"
        )
        const componentName = Object.keys(infos).find(
          name => infos[name].template === id
        )
        assert(
          componentName !== undefined,
          `Component not found for file id "${id}"`
        )

        const { html } = parseAst(src)

        const ast = transform({
          template: html,
          info: infos[componentName],
          infos,
          resolver: info => info.template
        })

        const code = generate(ast)

        return {
          code,
          ast: this.parse(code)
        }
      }
    },
    async configureServer(viteServer) {
      server = viteServer
    },
    async watchChange(id, change) {
      if (change.event === "create") {
        const detection = await detectComponent(scanDir, id)
        if (detection === null) return
        this.info({
          message: `New component detected ${detection.name}`
        })
        infos[detection.name] = detection.info
        return
      }
      if (change.event === "delete" && isComponentFile(id)) {
        server.restart()
      }
    }
  }
}
