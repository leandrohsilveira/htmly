import { generate } from "escodegen"
import {
  genArrayExpression,
  genArrowFunction,
  genCallExpression,
  genDefaultExport,
  genFunctionExpression,
  genIdentifier,
  genImportDeclaration,
  genImportDefaultSpecifier,
  genImportSpecifier,
  genLiteral,
  genObjectExpression,
  genProperty,
  genReturn
} from "./ast.js"
import { assert } from "@htmly/core"

/**
 *
 * @param {import("./types.js").Ast['html']} template
 * @param {import("./types.js").TransformController} controller
 * @param {import("acorn").Options} options
 * @returns {string}
 */
export function transform(template, controller, options) {
  const controllerIdentifier = genIdentifier("controller")
  const componentIdentifier = genIdentifier("component")
  const elementIdentifier = genIdentifier("element")
  const textIdentifier = genIdentifier("text")
  const ifIdentifier = genIdentifier("$if")
  const forIdentifier = genIdentifier("$for")
  const fragmentIdentifier = genIdentifier("fragment")
  const eventIdentifier = genIdentifier("event")

  /** @type {Set<import("acorn").Identifier>} */
  const signals = new Set()

  const renderers = new Set([componentIdentifier])

  /** @type {import("acorn").ImportDeclaration[]} */
  const imports = []

  const fragment = genFragment(...template)

  if (signals.size > 0) {
    imports.push(
      genImportDeclaration(
        "@htmly/core",
        ...Array.from(signals).map(signal => genImportSpecifier(signal))
      )
    )
  }

  imports.push(
    genImportDeclaration(
      "@htmly/core/renderer",
      ...Array.from(renderers).map(renderer => genImportSpecifier(renderer))
    )
  )

  imports.push(
    genImportDeclaration(
      controller.path,
      genImportDefaultSpecifier(controllerIdentifier)
    )
  )

  const toReturn = fragment ? fragment : genLiteral(null)

  return generate({
    sourceType: "module",
    start: 0,
    end: 0,
    type: "Program",
    body: [
      ...imports,
      genDefaultExport(
        genCallExpression(
          componentIdentifier,
          controllerIdentifier,
          genFunctionExpression({}, undefined, [], genReturn(toReturn))
        )
      )
    ]
  })

  /**
   * @param {import("./types.js").AstNode} ast
   * @returns {import("acorn").CallExpression | undefined}
   */
  function genNode(ast) {
    switch (ast.type) {
      case "Element":
        return genElement(ast)
      case "Expression":
      case "Text":
        return genText(ast)
      case "If":
        return genIf(ast)
      case "For":
        return genFor(ast)
    }
  }

  /**
   *
   * @param {import("./types.js").AstNodeElement} element
   * @returns {import("acorn").CallExpression | undefined}
   */
  function genElement(element) {
    if (element.name === "") return genFragment(...element.children)
    renderers.add(elementIdentifier)

    const properties = element.attributes.map(attr => {
      const nameIdentifier = genIdentifier(attr.name)
      switch (attr.kind) {
        case "Literal":
          return genProperty(nameIdentifier, genLiteral(attr.value.value))
        case "Flag":
          return genProperty(nameIdentifier, genLiteral(true))
        case "Property":
          return genProperty(
            nameIdentifier,
            genArrowFunction({}, attr.value.value)
          )
        case "Event":
          renderers.add(eventIdentifier)
          return genProperty(
            nameIdentifier,
            genCallExpression(eventIdentifier, attr.value.value)
          )
      }
    })

    const children = genFragment(...element.children)

    return genCallExpression(
      elementIdentifier,
      genLiteral(element.name),
      ...(element.attributes.length > 0 || element.children.length > 0
        ? [genObjectExpression(...properties)]
        : []),
      ...(children ? [children] : [])
    )
  }

  /**
   *
   * @param {import("./types.js").AstNodeText | import("./types.js").AstNodeExpression} node
   */
  function genText(node) {
    if (node.value === "") return undefined
    renderers.add(textIdentifier)
    if (node.type === "Text") {
      return genCallExpression(textIdentifier, genLiteral(node.value))
    }

    return genCallExpression(textIdentifier, genArrowFunction({}, node.value))
  }

  /**
   *
   * @param {import("./types.js").AstNodeIf} node
   * @returns {import("acorn").CallExpression | undefined}
   */
  function genIf(node) {
    if (
      node.then.length === 0 &&
      !node.elifs.some(elif => elif.then.length > 0) &&
      node.otherwise.length === 0
    )
      return undefined
    renderers.add(ifIdentifier)

    const thenFragment = genFragment(...node.then)

    const ifs = genArrayExpression(
      ...(thenFragment
        ? [genArrayExpression(genArrowFunction({}, node.test), thenFragment)]
        : []),
      ...node.elifs
        .map(iff => {
          const elifThenFragment = genFragment(...iff.then)
          if (!elifThenFragment) return undefined
          return genArrayExpression(
            genArrowFunction({}, iff.test),
            elifThenFragment
          )
        })
        .filter(expr => expr !== undefined)
    )

    const otherwiseFragment = genFragment(...node.otherwise)

    return genCallExpression(
      ifIdentifier,
      genObjectExpression(
        genProperty(genIdentifier("ifs"), ifs),
        ...(otherwiseFragment
          ? [genProperty(genIdentifier("otherwise"), otherwiseFragment)]
          : [])
      )
    )
  }

  /**
   *
   * @param {import("./types.js").AstNodeFor} ast
   * @returns {import("acorn").CallExpression | undefined}
   */
  function genFor(ast) {
    const fragment = genFragment(...ast.children)
    if (fragment === undefined) return undefined
    renderers.add(forIdentifier)

    const item = ast.item
    assert(
      item.type === "Identifier",
      "[Transform] for item expression should be an identifier"
    )

    return genCallExpression(
      forIdentifier,
      genObjectExpression(
        genProperty(genIdentifier("items"), genArrowFunction({}, ast.items)),
        genProperty(
          genIdentifier("trackBy"),
          genArrowFunction({}, ast.track, item)
        )
      ),
      genArrowFunction({}, fragment, item)
    )
  }

  /**
   *
   * @param  {...import("./types.js").AstNode} children
   * @returns {import("acorn").CallExpression | undefined}
   */
  function genFragment(...children) {
    const nodes = children.map(genNode).filter(node => node !== undefined)
    if (nodes.length === 0) return undefined
    if (nodes.length === 1) return nodes[0]
    renderers.add(fragmentIdentifier)
    return genCallExpression(fragmentIdentifier, ...nodes)
  }
}
