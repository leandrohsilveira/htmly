import { assert, component } from "@htmly/core"
import { parse } from "acorn"

/**
 *
 * @param {string} content
 * @param {import("acorn").Options} options
 * @returns {import("./types.js").AnalyzeResult}
 */
export function analyseController(content, options) {
  const program = parse(content, options)

  assert(
    program.sourceType === "module",
    "Controller must be a javascript module"
  )

  const defExport = program.body.find(
    el => el.type === "ExportDefaultDeclaration"
  )
  assert(
    defExport !== undefined,
    "[Analyze] controller must export default the controller"
  )

  const declaration = defExport.declaration
  assertControllerCallExpression(declaration)

  const [controllerFn] = declaration.arguments
  assert(
    controllerFn !== undefined,
    "[Analyze] call to controller must have one argument"
  )
  assert(
    controllerFn.type === "ArrowFunctionExpression" ||
      controllerFn.type === "FunctionExpression",
    `[Analyze] controller first argument must be an ArrowFunctionExpression or FunctionExpression, got: ${controllerFn.type}`
  )

  // TODO: read props

  const context = findControllerReturnStatement(controllerFn)

  /** @type {string[]} */
  const methods = []

  /** @type {string[]} */
  const variables = []

  for (const prop of context.properties) {
    assert(
      prop.type === "Property",
      `[Analyze] controller function must return an static object. Found ${prop.type} property`
    )
    assert(
      prop.key.type === "Identifier",
      `[Analyze] controller function return object key must be an Identifier, got: ${prop.key.type}`
    )
    const name = prop.key.name
    if (prop.method) methods.push(name)
    else variables.push(name)
  }

  return {
    variables,
    methods
  }
}

/**
 *
 * @param {import("acorn").ArrowFunctionExpression | import("acorn").FunctionExpression} expression
 *
 */
function findControllerReturnStatement({ body, async, generator }) {
  assert(
    async === false,
    "[Analyze] controller function should not be asynchronous"
  )
  assert(
    generator === false,
    "[Analyze] controller function should not be a generator"
  )
  assert(
    body.type === "ObjectExpression" || body.type === "BlockStatement",
    `[Analyze] controller function body should be an ObjectExpression or BlockExpression, got: ${body.type}`
  )

  if (body.type === "ObjectExpression") {
    return body
  }
  // is block statement
  for (const statement of body.body) {
    if (statement.type === "ReturnStatement") {
      assert(
        statement.argument !== undefined && statement.argument !== null,
        "[Analyze] controller function must have a return statement value"
      )
      assert(
        statement.argument.type === "ObjectExpression",
        `[Analyze] controller function return statement should be an ObjectExpression, got: ${statement.argument.type}`
      )
      return statement.argument
    }
  }
  throw new Error("[Analyze] controller function must have a return statement")
}

/**
 *
 * @param {import("acorn").ExportDefaultDeclaration['declaration']} declaration
 * @returns {asserts declaration is import("acorn").CallExpression}
 */
function assertControllerCallExpression(declaration) {
  assert(
    declaration.type === "CallExpression" &&
      declaration.callee.type === "Identifier" &&
      declaration.callee.name === component.name,
    "[Analyze] controller default export must be a call expression to component function"
  )
}
