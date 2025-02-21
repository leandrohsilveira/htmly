import { assert } from "@htmly/core"
import { compileAllComponents, compileComponent } from "@htmly/parser"

/**
 * @returns {import("vite").Plugin}
 */
export function htmlyPlugin() {
  /** @type {Record<string, import("@htmly/parser").ComponentInfo>} */
  let infos

  /** @type {import("vite").ResolvedConfig} */
  let config
  return {
    name: "vite-plugin-htmly",
    enforce: "pre",
    async configResolved(resolvedConfig) {
      config = resolvedConfig
    },
    async buildStart() {
      infos = await compileAllComponents("./src", "./src/.htmly")
      const componentsNames = Object.keys(infos)
      const count = componentsNames.length
      console.log(`Compiled ${count} components`)

      for (const componentName of componentsNames) {
        this.addWatchFile(infos[componentName].template)
      }
    },
    async configureServer({ watcher }) {
      watcher.on("change", async file => {
        if (!/\.component.html$/.test(file)) return
        assert(
          infos !== undefined,
          "Component info map should not be undefined at watchChange event"
        )
        const componentName = Object.keys(infos).find(
          name => infos[name].template === file
        )
        assert(
          componentName !== undefined,
          `Component not found for file id "${file}"`
        )
        await compileComponent(infos[componentName], infos)
      })
    }
  }
}
