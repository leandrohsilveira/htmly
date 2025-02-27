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
  STYLE_REGEX,
  TEMPLATE_REGEX,
  transform,
  scopeCss
} from "@htmly/parser"
import { generate } from "escodegen"
import path from "node:path"
import { preprocessCSS } from "vite"
import { generateRandomString } from "./util.js"

/**
 * @returns {Plugin}
 */
export function vitePlugin() {
  const scanDir = "./src"
  const templates = new Set()
  const styles = new Set()
  const scopes = new Set()

  /** @type {Record<string, ComponentInfo>} */
  let infos

  /** @type {ViteDevServer} */
  let server

  /** @type {ResolvedConfig} */
  let config

  /** @type {((componentName: string) => string) | undefined} */
  let genCssScope = undefined

  return {
    name: "vite-plugin-htmly",
    enforce: "pre",
    config() {
      return {
        css: {
          transformer: "lightningcss"
        }
      }
    },
    configResolved(_config) {
      config = _config
      if (config.command === "build") {
        genCssScope = () => {
          let size = 3
          let scope
          do {
            const random = generateRandomString(size)
            scope = `_${random}_`
            size++
          } while (scopes.has(scope))
          scopes.add(scope)
          return scope
        }
      }
    },
    async configureServer(viteServer) {
      server = viteServer
    },
    async buildStart() {
      infos = await scanComponents(
        scanDir,
        info => {
          const context = info.template ?? info.controller ?? info.styles
          assert(
            context !== undefined,
            `Unable to determine context for ${info.baseName}`
          )
          return path.dirname(context)
        },
        {
          cwd: config.root,
          genCssScope
        }
      )
    },
    async resolveId(id, importer, options) {
      const resolved = await this.resolve(id, importer, options)
      if (
        resolved &&
        !resolved.external &&
        TEMPLATE_REGEX.test(id) &&
        importer
      ) {
        templates.add(resolved.id)
        if (config.command === "build")
          return {
            ...resolved,
            id: `${resolved.id}?htmly`
          }
        return resolved
      }

      if (resolved && !resolved.external && STYLE_REGEX.test(id) && importer) {
        styles.add(resolved.id)
        return resolved
      }

      return null
    },
    async transform(src, id) {
      const fileName = id.replace(/\?htmly$/, "")
      if (templates.has(fileName)) {
        assert(
          infos !== undefined,
          "Component info map should not be undefined at watchChange event"
        )
        const componentName = Object.keys(infos).find(
          name => infos[name].template === fileName
        )
        assert(
          componentName !== undefined,
          `Component not found for file id "${fileName}"`
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
      if (styles.has(id)) {
        assert(
          infos !== undefined,
          "Component info map should not be undefined at watchChange event"
        )
        const componentName = Object.keys(infos).find(
          name => infos[name].styles === fileName
        )
        assert(
          componentName !== undefined,
          `Component not found for file id "${fileName}"`
        )
        const info = infos[componentName]
        if (info.scope) {
          const { code } = await preprocessCSS(src, id, config)

          return {
            code: scopeCss(code, info.scope)
          }
        }
      }
    },
    async watchChange(id, change) {
      if (change.event === "create") {
        const detection = await detectComponent(scanDir, id)
        if (detection === null) return
        this.info({
          message: `New component detected ${detection.name}`
        })
        infos[detection.name] = detection
        return
      }
      if (change.event === "delete" && isComponentFile(id)) {
        server.restart()
      }
    }
  }
}
