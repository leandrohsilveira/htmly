/**
@import { ComponentInfo } from "@htmly/parser"
@import { Program } from "jscodeshift"
*/
import { generate } from "escodegen"
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { parseAst } from "./parser.js"
import { scanComponents } from "./scan.js"
import { transform } from "./transform.js"

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
    const ast = await generateComponentAst(info, infos)
    const componentContent = await compiler(ast)
    await fs.promises.mkdir(path.dirname(info.component), { recursive: true })
    await fs.promises.writeFile(info.component, componentContent, "utf-8")
  }

  return infos
}

/**
 *
 * @param {ComponentInfo} info
 * @param {Record<string, ComponentInfo>} infos
 * @param {(info: ComponentInfo) => string} [resolver]
 */
export async function generateComponentAst(info, infos, resolver) {
  resolver ??= info => info.component
  const templateContent = await fs.promises.readFile(info.template)
  const templateAst = parseAst(templateContent.toString("utf-8"))
  return transform({
    template: templateAst,
    info,
    infos,
    resolver
  })
}

/**
 *
 * @param {ComponentInfo} info
 * @param {Record<string, ComponentInfo>} infos
 */
export async function compileComponent(info, infos) {
  // TODO: read from options optional param with these defaults
  const compiler = defaultCompiler
  const ast = await generateComponentAst(info, infos)

  const code = await compiler(ast)
  await fs.promises.writeFile(info.component, code, "utf-8")

  return {
    ast,
    code
  }
}

/**
 * @param {Program} ast
 */
async function defaultCompiler(ast) {
  return generate(ast)
}
