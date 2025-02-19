import fs from "node:fs"
import process from "node:process"
import path from "node:path"
import { parseAst, transform, scanComponents } from "@htmly/parser"

/**
 * @param {string} scanDir
 * @param {string} outDir
 */
async function run(scanDir, outDir) {
  const cwd = process.cwd()
  const infos = await scanComponents(scanDir, outDir, { cwd })

  for (const [name, info] of Object.entries(infos)) {
    const templateContent = fs.readFileSync(info.template)
    const ast = parseAst(templateContent.toString("utf-8"))
    const js = transform(
      ast.html,
      path.relative(info.component, info.controller),
      infos,
      outDir,
      { cwd }
    )
    fs.writeFileSync(info.component, js, "utf-8")
  }
}

run("./src", "./src/.htmly")
