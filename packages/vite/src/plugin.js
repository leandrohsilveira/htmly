/**
@import {Plugin, ViteDevServer, ResolvedConfig} from "vite"
@import {ComponentInfo} from "@htmly/parser"
 */
import { assert } from "@htmly/core"
import {
  detectComponent,
  isComponentFile,
  parseAst,
  scanComponents,
  TEMPLATE_REGEX,
  transform
} from "@htmly/parser"
import { generate } from "escodegen"
import path from "node:path"

/**
 * @returns {Plugin}
 */
export function vitePlugin() {
  const scanDir = "./src"
  const ids = new Set()

  /** @type {Record<string, ComponentInfo>} */
  let infos

  /** @type {ViteDevServer} */
  let server

  /** @type {ResolvedConfig} */
  let config

  return {
    name: "vite-plugin-htmly",
    enforce: "pre",
    configResolved(_config) {
      config = _config
    },
    async configureServer(viteServer) {
      server = viteServer
    },
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
        TEMPLATE_REGEX.test(id) &&
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

        const template = parseAst(src)

        const ast = transform({
          template,
          info: infos[componentName],
          infos,
          resolver: info => info.template
        })

        let code = generate(ast)

        return {
          code,
          ast: this.parse(code)
        }
      }
    },
    async watchChange(id, change) {
      if (change.event === "create") {
        const detection = await detectComponent(scanDir, id)
        if (detection === null) return
        if (!infos[detection.name])
          this.info({
            message: `New component detected ${detection.name}`
          })
        else {
          this.info({
            message: `Component ${detection.name} info updated`
          })
          const module = server.moduleGraph.getModuleById(
            detection.info.template
          )
          assert(module !== undefined, "Module cant be undefined")
          server.reloadModule(module)
        }
        infos[detection.name] = detection.info

        return
      }
      if (change.event === "delete" && isComponentFile(id)) {
        server.restart()
      }
    }
  }
}
