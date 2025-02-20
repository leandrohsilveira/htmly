import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { parseAst, transform, scanComponents } from "@htmly/parser"

/**
 * @param {string} scanDir
 * @param {string} outDir
 */
async function run(scanDir, outDir) {
  const cwd = process.cwd()

  await fs.promises.mkdir(outDir, { recursive: true })

  const infos = await scanComponents(scanDir, outDir, { cwd })

  for (const [, info] of Object.entries(infos)) {
    const templateContent = await fs.promises.readFile(info.template)
    const ast = parseAst(templateContent.toString("utf-8"))
    // TODO: detect imported components to avoid compiling unused components
    const component = transform({
      template: ast.html,
      info,
      infos,
      outDir,
      cwd
    })
    await fs.promises.writeFile(info.component, component, "utf-8")
  }
}

run("./src", "./src/.htmly")
