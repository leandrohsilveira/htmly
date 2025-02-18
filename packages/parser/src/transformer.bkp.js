import { assert } from "@htmly/core"
import { parse } from "acorn"

/**
 *
 * @param {import("./types.js").Ast} ast parsed HTML AST
 * @param {string} controller path to the controller source code
 * @param {'esm' | 'cjs'} [mode]
 */
export function transform({ html }, controller, mode = "esm") {
  /** @type {Set<string>} */
  const identifiers = new Set()

  /** @type {Set<string>} */
  const signals = new Set()

  const renderers = new Set(["component"])

  const children = html.flatMap(ast => node(ast, "    "))

  return [
    ...(signals.size > 0 ? [writeImport("alien-signals", signals)] : []),
    writeImport("@htmly/core/renderer", renderers, mode),
    writeImport(controller, "controller", mode),
    "\n",
    // TODO: implement component tag name
    line(writeExportStatement("component(", mode), ""),
    line("controller,", "  "),
    line(`(${resolveObjectDestructure(identifiers, "")}) => ([`, "  "),
    ...children,
    line("]),", "  "),
    line(")", "")
  ].join("\n")

  /**
   * @param {import("./types.js").AstNode} ast
   * @param {string} [spacing]
   */
  function node(ast, spacing = "") {
    switch (ast.type) {
      case "Element":
        return element(ast, spacing)
      case "Expression":
      case "Text":
        return text(ast, spacing)
    }
  }

  /**
   *
   * @param {import("./types.js").AstNodeElement} ast
   * @param {string} [spacing]
   * @returns {string[]}
   */
  function element(ast, spacing = "") {
    renderers.add("element")

    const inner = `${spacing}  `

    const props = [
      line("{", inner),
      ...ast.attributes.map(attr =>
        line(`${attr.name}: ${resolveValue(attr.value)},`, `${inner}  `)
      ),
      line("},", inner)
    ]

    const children = ast.children.flatMap(ast => node(ast, inner))
    if (ast.attributes.length === 0 && ast.children.length === 0)
      return [line(`element("${ast.name}"),`, spacing)]
    return [
      line("element(", spacing),
      line(`"${ast.name}",`, inner),
      ...(ast.attributes.length > 0 ? props : [line("{},", inner)]),
      ...(ast.children.length > 0 ? children : []),
      line("),", spacing)
    ]
  }

  /**
   *
   * @param {import("./types.js").AstNodeText | import("./types.js").AstNodeExpression} ast
   * @param {string} [spacing]
   */
  function text(ast, spacing = "") {
    renderers.add("text")
    const value = resolveValue(ast)
    return [line(`text(${value}),`, spacing)]
  }

  /**
   *
   * @param {import("./types.js").AstNodeExpression} ast
   */
  function expressionValue(ast) {
    /** @type {Set<import("acorn").Identifier>} */
    const ids = new Set()
    const result = (() => {
      switch (ast.value.type) {
        case "Identifier":
          return resolveExpression(ast.value, ids)
        case "ArrowFunctionExpression":
          return resolveExpression(ast.value, ids, true)
        default:
          signals.add("computed")
          return `computed(() => ${resolveExpression(ast.value, ids, true)})`
      }
    })()
    ids.forEach(id => identifiers.add(id.name))
    return result
  }

  /**
   *
   * @param {import("acorn").Expression | import("acorn").PrivateIdentifier | import("acorn").BlockStatement} expression
   * @param {Set<import("acorn").Identifier>} identifiers
   * @param {boolean} [resolveSignal=false]
   * @returns {string}
   */
  function resolveExpression(expression, identifiers, resolveSignal = false) {
    switch (expression.type) {
      case "Literal":
        return expression.raw ?? "undefined"
      case "Identifier":
        identifiers.add(expression)
        const ref = expression.name
        if (resolveSignal) return `${ref}()`
        return ref
      case "BinaryExpression":
        const left = resolveExpression(
          expression.left,
          identifiers,
          resolveSignal
        )
        const right = resolveExpression(
          expression.right,
          identifiers,
          resolveSignal
        )
        return `(${left} ${expression.operator} ${right})`
      case "ConditionalExpression":
        const test = resolveExpression(
          expression.test,
          identifiers,
          resolveSignal
        )
        const consequent = resolveExpression(
          expression.consequent,
          identifiers,
          resolveSignal
        )
        const alternate = resolveExpression(
          expression.alternate,
          identifiers,
          resolveSignal
        )
        return `(${test} ? ${consequent} : ${alternate})`
      case "ArrowFunctionExpression":
        const prefix = expression.async ? "async " : ""

        // TODO: identifiers scope
        const paramIds = expression.params.map(expr => {
          assert(
            expr.type === "Identifier",
            "Parse error: ArrowFunctionExpression parameter must be an identifier"
          )
          return expr.name
        })
        const params = `(${paramIds.join(", ")})`
        /** @type {Set<import("acorn").Identifier>} */
        const bodyIdentifiers = new Set()
        const body = resolveExpression(
          expression.body,
          bodyIdentifiers,
          resolveSignal
        )
        bodyIdentifiers.forEach(id => {
          if (paramIds.indexOf(id.name) < 0) identifiers.add(id)
        })
        return `${prefix}${params} => ${body}`
      case "CallExpression":
        const callee = expression.callee
        assert(
          callee.type === "Identifier",
          "Template call expression callee must be an identifeir"
        )
        const identifeir = resolveExpression(callee, identifiers, false)
        const acessor = expression.optional ? "?." : ""
        const argsExpressions = expression.arguments.map(arg => {
          assert(
            arg.type !== "SpreadElement",
            "Parse error: CallExpression argument of type SpreadElement is not supported"
          )
          return resolveExpression(arg, identifiers, resolveSignal)
        })
        const args = `(${argsExpressions.join(", ")})`
        return `${identifeir}${acessor}${args}`
      default:
        throw new Error(`Unsupported expression type "${expression.type}"`)
    }
  }

  /**
   *
   * @param {import("./types.js").AstNodeText} ast
   */
  function textValue(ast) {
    return `"${ast.value}"`
  }

  /**
   *
   * @param {import("./types.js").AstNodeExpression | import("./types.js").AstNodeText} ast
   */
  function resolveValue(ast) {
    if (ast.type === "Text") return textValue(ast)
    return expressionValue(ast)
  }
}

/**
 *
 * @param {string} path
 * @param {string | string[] | Set<string>} items
 * @param {'esm' | 'cjs'} [mode]
 */
function writeImport(path, items, mode = "esm") {
  const vars =
    typeof items === "string" ? items : resolveObjectDestructure(items)
  if (mode === "cjs") return `const ${vars} = require("${path}")`
  return `import ${vars} from "${path}"`
}

/**
 *
 * @param {string} statement
 * @param {'esm' | 'cjs'} [mode]
 */
function writeExportStatement(statement, mode = "esm") {
  if (mode === "cjs") return `module.exports = ${statement}`
  return `export default ${statement}`
}

/**
 *
 * @param {Set<string> | string[]} items
 * @param {string} [empty='{}']
 */
function resolveObjectDestructure(items, empty = "{}") {
  const array = Array.from(items)
  if (array.length === 0) return empty
  return `{ ${array.join(", ")} }`
}

/**
 *
 * @param {string} text
 * @param {string} space
 */
function line(text, space) {
  return `${space}${text}`
}
