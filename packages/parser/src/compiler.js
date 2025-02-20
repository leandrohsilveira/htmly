import fs from "node:fs"
import { parseAst } from "./parser.js"
import { transform } from "./transformer.js"
import { scanComponents } from "./scan.js"
import process from "node:process"
import { generate } from "escodegen"

/**
 *
 * @param {string} scanDir
 * @param {string} outDir
 */
export async function compileAllComponents(scanDir, outDir) {
  // TODO: read from options optional param with these defaults
  const compiler = defaultCompiler
  const cwd = process.cwd()
  const prefix = "app"

  const infos = await scanComponents(scanDir, outDir, { cwd, prefix })
  for (const [, info] of Object.entries(infos)) {
    const ast = await compileComponent(info, infos)
    const componentContent = await compiler(ast)
    await fs.promises.writeFile(info.component, componentContent, "utf-8")
  }

  return infos
}

/**
 *
 * @param {import("./types.js").ComponentInfo} info
 * @param {Record<string, import("./types.js").ComponentInfo>} infos
 */
export async function compileComponent(info, infos) {
  const templateContent = await fs.promises.readFile(info.template)
  const templateAst = parseAst(templateContent.toString("utf-8"))
  // TODO: detect imported components to avoid compiling unused components
  return transform({
    template: templateAst.html,
    info,
    infos
  })
}

/**
 * @param {import("acorn").Program} ast
 */
async function defaultCompiler(ast) {
  return generate(ast)
}
