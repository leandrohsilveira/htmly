import { assert } from "@htmly/core"
import path from "node:path"
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
  genReturn,
  genVariableDeclaration,
  genVariableDeclarator
} from "./ast.js"
import { relative } from "./util.js"

/**
 *
 * @param {import("./types.js").TransformOptions} options
 * @returns {import("acorn").Program}
 */
export function transform({ template, info, infos, resolver }) {
  const controller = relative(info.context, info.controller)
  const controllerIdentifier = genIdentifier("controller")
  const componentIdentifier = genIdentifier("$c")
  const elementIdentifier = genIdentifier("$e")
  const textIdentifier = genIdentifier("$t")
  const ifIdentifier = genIdentifier("$if")
  const forIdentifier = genIdentifier("$for")
  const fragmentIdentifier = genIdentifier("$f")

  const renderers = new Set([componentIdentifier])

  /** @type {Record<string, import("acorn").ImportDeclaration>} */
  const components = {}

  /** @type {import("acorn").ImportDeclaration[]} */
  const imports = []

  /** @type {Set<string>} */
  const elements = new Set()

  const fragment = genFragment(...template)

  imports.push(
    genImportDeclaration(
      "@htmly/core/renderer",
      ...Array.from(renderers).map(renderer => genImportSpecifier(renderer))
    )
  )

  if (info.styles) {
    imports.push(genImportDeclaration(relative(info.context, info.styles)))
  }

  imports.push(
    genImportDeclaration(
      controller,
      genImportDefaultSpecifier(controllerIdentifier)
    )
  )

  imports.push(...Object.values(components))

  const toReturn = fragment ? fragment : genLiteral(null)

  return {
    sourceType: "module",
    start: 0,
    end: 0,
    type: "Program",
    body: [
      ...imports,
      ...(elements.size > 0
        ? [
            genVariableDeclaration(
              "const",
              ...Array.from(elements).map(el =>
                genVariableDeclarator(
                  genIdentifier(el),
                  genCallExpression(elementIdentifier, genLiteral(el))
                )
              )
            )
          ]
        : []),
      genDefaultExport(
        genCallExpression(
          componentIdentifier,
          controllerIdentifier,
          genFunctionExpression({}, undefined, [], genReturn(toReturn))
        )
      )
    ]
  }

  /**
   * @param {import("./types.js").AstNode} ast
   * @returns {import("acorn").CallExpression | undefined}
   */
  function genNode(ast) {
    switch (ast.type) {
      case "Element":
        if (infos[ast.name]) return genComponent(ast, infos[ast.name])
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
    elements.add(element.name)
    renderers.add(elementIdentifier)

    const { attrs, props, events } = genAttributes(element.attributes)

    const child = genFragment(...element.children)

    /** @type {import("acorn").CallExpression['arguments']} */
    const params = []

    if (child || attrs.length > 0 || props.length > 0 || events.length > 0) {
      /** @type {import("acorn").Property[]} */
      const objectProps = []
      if (attrs.length > 0) {
        objectProps.push(
          genProperty(genIdentifier("attrs"), genObjectExpression(...attrs))
        )
      }
      if (props.length > 0) {
        objectProps.push(
          genProperty(genIdentifier("props"), genObjectExpression(...props))
        )
      }
      if (events.length > 0) {
        objectProps.push(
          genProperty(genIdentifier("events"), genObjectExpression(...events))
        )
      }
      if (child) {
        objectProps.push(genProperty(genIdentifier("child"), child))
      }
      params.push(genObjectExpression(...objectProps))
    }

    return genCallExpression(genIdentifier(element.name), ...params)
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

    /** @type {import("acorn").Property[]} */
    const optional = []

    const emptyFragment = genFragment(...ast.empty)

    if (emptyFragment) {
      optional.push(genProperty(genIdentifier("empty"), emptyFragment))
    }

    return genCallExpression(
      forIdentifier,
      genObjectExpression(
        genProperty(genIdentifier("items"), genArrowFunction({}, ast.items)),
        genProperty(
          genIdentifier("trackBy"),
          genArrowFunction({}, ast.track, item)
        ),
        ...optional
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

  /**
   *
   * @param {import("./types.js").AstNodeElement} ast
   * @param {import("./types.js").ComponentInfo} componentToImport
   * @returns {import("acorn").CallExpression}
   */
  function genComponent(ast, componentToImport) {
    const tagName = ast.name
    const varName = tagName.replace(/[-.]/g, "_")
    const identifier = genIdentifier(varName)

    components[tagName] = genImportDeclaration(
      relative(info.context, resolver(componentToImport)),
      genImportDefaultSpecifier(identifier)
    )

    const { attrs, props, events } = genAttributes(ast.attributes)

    /** @type {import("acorn").Property[]} */
    const objectProps = []
    if (attrs.length > 0) {
      objectProps.push(
        genProperty(genIdentifier("attrs"), genObjectExpression(...attrs))
      )
    }
    if (props.length > 0) {
      objectProps.push(
        genProperty(genIdentifier("props"), genObjectExpression(...props))
      )
    }
    if (events.length > 0) {
      objectProps.push(
        genProperty(genIdentifier("events"), genObjectExpression(...events))
      )
    }

    return genCallExpression(identifier, genObjectExpression(...objectProps))
  }

  /**
   *
   * @param {import("./types.js").AstNodeAttribute[]} attributes
   * @returns {Record<'attrs' | 'props' | 'events', import("acorn").Property[]>}
   */
  function genAttributes(attributes) {
    return attributes.reduce(
      (result, attr) => {
        const nameLiteral = genLiteral(attr.name)
        switch (attr.kind) {
          case "Literal":
            return {
              ...result,
              attrs: [
                ...result.attrs,
                genProperty(nameLiteral, genLiteral(attr.value.value))
              ]
            }
          case "Flag":
            return {
              ...result,
              attrs: [
                ...result.attrs,
                genProperty(nameLiteral, genLiteral(true))
              ]
            }
          case "Property":
            return {
              ...result,
              props: [
                ...result.props,
                genProperty(nameLiteral, genArrowFunction({}, attr.value.value))
              ]
            }

          case "Event":
            return {
              ...result,
              events: [
                ...result.events,
                genProperty(nameLiteral, attr.value.value)
              ]
            }
        }
      },
      /** @type {Record<'attrs' | 'props' | 'events', import("acorn").Property[]>} */ ({
        attrs: [],
        props: [],
        events: []
      })
    )
  }
}
