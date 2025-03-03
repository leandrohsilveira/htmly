/**
@import {Plugin, ViteDevServer, ResolvedConfig} from "vite"
@import {ResolvedHtmlyConfig} from "@htmly/core/config"
@import {ComponentInfo, LoadConfigOptions} from "@htmly/parser"
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
  scopeCss,
  loadConfig,
  mergeInfos,
  findNamespace
} from "@htmly/parser"
import { generate } from "escodegen"
import path from "node:path"
import { preprocessCSS } from "vite"
import { generateRandomString } from "./util.js"

/**
 * @param {LoadConfigOptions} [options]
 * @returns {Plugin}
 */
export function vitePlugin(options) {
  const templates = new Set()
  const styles = new Set()
  const scopes = new Set()

  /** @type {Record<string, ComponentInfo>} */
  let infos = {}

  /** @type {ViteDevServer} */
  let server

  /** @type {ResolvedConfig} */
  let viteConfig

  /** @type {ResolvedHtmlyConfig} */
  let htmlyConfig

  /** @type {((componentName: string) => string) | undefined} */
  let genCssScope = undefined

  return {
    name: "vite-plugin-htmly",
    enforce: "pre",
    config() {
      return {
        root: options?.cwd,
        css: {
          transformer: "lightningcss"
        }
      }
    },
    async configResolved(_config) {
      viteConfig = _config
      htmlyConfig = (await loadConfig(options)).config
      if (viteConfig.command === "build") {
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
      for (const [prefix, namespace] of Object.entries(
        htmlyConfig.namespaces
      )) {
        const _infos = await scanComponents(
          namespace.scanDir,
          info => {
            const context = info.template ?? info.controller ?? info.styles
            assert(
              context !== undefined,
              `Unable to determine context for ${info.baseName}`
            )
            return path.dirname(context)
          },
          {
            prefix,
            cwd: viteConfig.root,
            genCssScope
          }
        )

        infos = mergeInfos(_infos, infos)
      }
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
        if (viteConfig.command === "build")
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
        const componentName = Object.keys(infos).find(
          name => infos[name].styles === fileName
        )
        assert(
          componentName !== undefined,
          `Component not found for file id "${fileName}"`
        )
        const info = infos[componentName]
        if (info.scope) {
          const { code } = await preprocessCSS(src, id, viteConfig)

          return {
            code: scopeCss(code, info.scope)
          }
        }
      }
    },
    async watchChange(id, change) {
      if (change.event === "create") {
        const [prefix, namespace] = findNamespace(
          htmlyConfig.namespaces,
          id,
          viteConfig.root
        )
        assert(prefix !== null, `Unable to find namespace for ${id}`)
        const detection = await detectComponent(namespace.scanDir, id, {
          cwd: viteConfig.root,
          prefix,
          genCssScope
        })
        if (detection === null) return
        if (!infos[detection.name]) {
          this.info({
            message: `New component detected ${detection.name}`
          })
          infos[detection.name] = detection
        } else {
          this.info({
            message: `Component ${detection.name} info updated`
          })
          const module = server.moduleGraph.getModuleById(detection.template)
          assert(module !== undefined, "Module cant be undefined")
          server.reloadModule(module)
        }
        return
      }
      if (change.event === "delete" && isComponentFile(id)) {
        server.restart()
      }
    }
  }
}
