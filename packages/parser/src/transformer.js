/**
@import {
  Program,
  Pattern,
  ImportDeclaration,
  CallExpression,
  Property,
} from "acorn"
@import {
  AstNode,
  AstNodeElement,
  AstNodeAttribute,
  TransformOptions,
  AstNodeText,
  AstNodeExpression,
  AstNodeIf,
  AstNodeFor,
  ComponentInfo,
  AstNodeElseIf,
} from "./types.js"
*/
import { assert } from "@htmly/core"
import {
  genArrayExpression,
  genArrowFunction,
  genAssignmentProperty,
  genCallExpression,
  genDefaultExport,
  genFunctionExpression,
  genIdentifier,
  genImportDeclaration,
  genImportDefaultSpecifier,
  genImportSpecifier,
  genLiteral,
  genMemberExpression,
  genObjectExpression,
  genObjectPattern,
  genProperty,
  genReturn,
  genVariableDeclaration,
  genVariableDeclarator
} from "./ast.js"
import { relative } from "./util.js"

/**
 *
 * @param {TransformOptions} options
 * @returns {Program}
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
  const slotsIdentifier = genIdentifier("$$slots")

  /**
   * @type {Set<Pattern>}
   */
  const componentFnParams = new Set()

  const renderers = new Set([componentIdentifier])

  /** @type {Record<string, ImportDeclaration>} */
  const components = {}

  /** @type {ImportDeclaration[]} */
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
          genFunctionExpression(
            {},
            undefined,
            Array.from(componentFnParams),
            genReturn(toReturn)
          )
        )
      )
    ]
  }

  /**
   * @param {AstNode} ast
   * @returns {CallExpression | undefined}
   */
  function genNode(ast) {
    switch (ast.type) {
      case "Element":
        if (ast.name === "template") return undefined
        if (ast.name === "slot") return genSlot(ast)
        if (infos[ast.name]) return genComponent(ast, infos[ast.name])
        return genElement(ast)
      case "Expression":
      case "Text":
        return genText(ast)
      case "If":
      case "ElseIf":
        return genIf(ast)
      case "For":
        return genFor(ast)
    }
  }

  /**
   *
   * @param {AstNodeElement} element
   * @returns {CallExpression | undefined}
   */
  function genElement(element) {
    if (element.name === "") return genFragment(...element.children)
    elements.add(element.name)
    renderers.add(elementIdentifier)

    const { attrs, props, events } = genAttributes(element.attributes)

    const child = genFragment(...element.children)

    /** @type {CallExpression['arguments']} */
    const params = []

    if (child || attrs.length > 0 || props.length > 0 || events.length > 0) {
      /** @type {Property[]} */
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
   * @param {AstNodeText | AstNodeExpression} node
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
   * @param {AstNodeIf | AstNodeElseIf} node
   * @returns {CallExpression | undefined}
   */
  function genIf(node) {
    assert(
      node.type === "If",
      "ElseIf nodes are only allowed in elifs of If nodes"
    )
    const otherwise = node.otherwise ?? []
    const elifs = node.elifs ?? []
    if (
      node.then.length === 0 &&
      !elifs.some(elif => elif.then.length > 0) &&
      otherwise.length === 0
    )
      return undefined
    renderers.add(ifIdentifier)

    const thenFragment = genFragment(...node.then)

    const ifs = genArrayExpression(
      ...(thenFragment
        ? [genArrayExpression(genArrowFunction({}, node.test), thenFragment)]
        : []),
      ...elifs
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

    const otherwiseFragment = genFragment(...otherwise)

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
   * @param {AstNodeFor} ast
   * @returns {CallExpression | undefined}
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

    /** @type {Property[]} */
    const optional = []

    const emptyFragment = genFragment(...(ast.empty ?? []))

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
   * @param  {...AstNode} children
   * @returns {CallExpression | undefined}
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
   * @param {AstNodeElement} ast
   * @param {ComponentInfo} componentToImport
   * @returns {CallExpression}
   */
  function genComponent(ast, componentToImport) {
    const tagName = ast.name
    const varName = tagName.replace(/[-.]/g, "_")
    const identifier = genIdentifier(varName)

    /** @type {Record<string, { nodes: AstNode[], lets: AstNodeAttribute[] }[]>} */
    const slots = {}

    for (const child of ast.children) {
      const { name, nodes, lets } = toSlot(child)
      slots[name] ??= []
      slots[name].push({ nodes, lets })
    }

    components[tagName] = genImportDeclaration(
      relative(info.context, resolver(componentToImport)),
      genImportDefaultSpecifier(identifier)
    )

    const { attrs, props, events } = genAttributes(ast.attributes)

    /** @type {Property[]} */
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
    const slotsNames = Object.keys(slots)
    if (slotsNames.length > 0) {
      /** @type {Property[]} */
      const slotsProperties = []
      for (const slotName of slotsNames) {
        const items = slots[slotName]
        const callExpression = genFragment(...items.flatMap(item => item.nodes))
        const contexts = items
          .flatMap(item => item.lets)
          .map(item => item.name.replace(/^let-/, ""))
        if (!callExpression) continue
        slotsProperties.push(
          genProperty(
            genLiteral(slotName),
            genArrowFunction(
              {},
              callExpression,
              ...(contexts.length > 0
                ? [
                    genObjectPattern(
                      ...contexts.map(name => {
                        const id = genIdentifier(name)
                        return genAssignmentProperty(id, id)
                      })
                    )
                  ]
                : [])
            )
          )
        )
      }

      if (slotsProperties.length > 0) {
        objectProps.push(
          genProperty(
            genIdentifier("slots"),
            genObjectExpression(...slotsProperties)
          )
        )
      }
    }

    return genCallExpression(identifier, genObjectExpression(...objectProps))
  }

  /**
   * @param {AstNodeElement} ast
   * @returns {CallExpression}
   */
  function genSlot(ast) {
    componentFnParams.add(slotsIdentifier)

    const { props } = genAttributes(
      ast.attributes.filter(attr => attr.name !== "name")
    )

    const nameAttr = ast.attributes.find(attr => attr.name === "name")

    const name =
      nameAttr?.value?.type === "Text" ? nameAttr.value.value : "default"

    return genCallExpression(
      genMemberExpression(slotsIdentifier, genLiteral(name ?? "default"), {
        computed: true
      }),
      genObjectExpression(...props)
    )
  }

  /**
   *
   * @param {AstNodeAttribute[]} attributes
   * @returns {Record<'attrs' | 'props' | 'events', Property[]>}
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
      /** @type {Record<'attrs' | 'props' | 'events', Property[]>} */ ({
        attrs: [],
        props: [],
        events: []
      })
    )
  }
}

/**
 * @param {AstNode} node
 * @returns {{ name: string, nodes: AstNode[], lets: AstNodeAttribute[] }}
 */
function toSlot(node) {
  if (node.type !== "Element")
    return { name: "default", nodes: [node], lets: [] }
  if (node.name !== "template")
    return { name: "default", nodes: [node], lets: [] }
  const nameAttr = node.attributes.find(attr => attr.name === "slot")
  const lets = node.attributes.filter(attr => /^let-\w+[\d\w]*/.test(attr.name))
  if (nameAttr === undefined)
    return { name: "default", nodes: node.children, lets }
  if (nameAttr.value.type === "Text")
    return { name: nameAttr.value.value, nodes: node.children, lets }
  return { name: "default", nodes: node.children, lets }
}
