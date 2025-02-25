/**
@import { 
    TransformOptions,
    AstNode,
    AstNodeElement,
    AstNodeAttribute,
    AstNodeExpression,
    AstNodeText,
    AstNodeIf,
    AstNodeElseIf,
    AstNodeFor,
    ComponentInfo
} from "./types.js"
@import {
    CallExpression,
    Property,
    ObjectExpression
} from "jscodeshift"
*/
import { assert } from "@htmly/core"
import jscodeshift from "jscodeshift"
import { parseTagNameToVarName, relative } from "./util.js"
import { generateCssScopeAttribute } from "./style.js"

const {
  callExpression,
  identifier,
  property,
  literal,
  arrowFunctionExpression,
  objectExpression,
  objectPattern,
  program,
  arrayExpression,
  importDeclaration,
  importSpecifier,
  importDefaultSpecifier,
  variableDeclaration,
  variableDeclarator,
  functionExpression,
  returnStatement,
  blockStatement,
  exportDefaultDeclaration,
  memberExpression
} = jscodeshift

/**
 * @typedef TransformContext
 * @property {Set<string>} elements
 * @property {Set<string>} renderers
 * @property {Set<string>} components
 * @property {Set<string>} componentFnParams
 * @property {ComponentInfo} info
 * @property {Record<string, ComponentInfo>} infos
 */

/**
 *
 * @param {TransformOptions} options
 */
export function transform({ template, info, infos, resolver }) {
  const controller = relative(info.context, info.controller)

  /** @type {TransformContext} */
  const context = {
    info,
    infos,
    elements: new Set(),
    renderers: new Set(["$c"]),
    components: new Set(),
    componentFnParams: new Set()
  }

  const child = onFragment(context, template)

  const component = program([
    importDeclaration(
      Array.from(context.renderers).map(renderer =>
        importSpecifier(identifier(renderer))
      ),
      literal("@htmly/core/renderer")
    ),
    importDeclaration(
      [importDefaultSpecifier(identifier("controller"))],
      literal(controller)
    )
  ])

  if (info.styles) {
    component.body.push(
      importDeclaration([], literal(relative(info.context, info.styles)))
    )
  }

  if (context.components.size) {
    for (const name of context.components) {
      component.body.push(
        importDeclaration(
          [importDefaultSpecifier(identifier(parseTagNameToVarName(name)))],
          literal(relative(info.context, resolver(infos[name])))
        )
      )
    }
  }

  if (context.elements.size) {
    component.body.push(
      variableDeclaration(
        "const",
        Array.from(context.elements).map(name =>
          variableDeclarator(
            identifier(name),
            callExpression(identifier("$e"), [literal(name)])
          )
        )
      )
    )
  }

  component.body.push(
    exportDefaultDeclaration(
      callExpression(identifier("$c"), [
        literal(info.name),
        identifier("controller"),
        functionExpression(
          null,
          Array.from(context.componentFnParams).map(param => identifier(param)),
          blockStatement([returnStatement(child ? child : literal(null))])
        )
      ])
    )
  )

  return component
}

/**
 *
 * @param {TransformContext} root
 * @param {AstNode[]} nodes
 * @returns {CallExpression | undefined}
 */
function onFragment(root, nodes) {
  /** @type {CallExpression[]} */
  const elements = onNodes(root, nodes)
  if (elements.length === 0) return undefined
  if (elements.length === 1) return elements[0]
  root.renderers.add("$f")
  return callExpression(identifier("$f"), elements)
}

/**
 * @param {TransformContext} root
 * @param {AstNode[]} nodes
 */
function onNodes(root, nodes) {
  /** @type {CallExpression[]} */
  const calls = []
  for (const node of nodes) {
    const result = onNode(root, node)
    if (result) calls.push(result)
  }
  return calls
}

/**
 *
 * @param {TransformContext} root
 * @param {AstNode} node
 * @returns {CallExpression | undefined}
 */
function onNode(root, node) {
  switch (node.type) {
    case "Element":
      if (node.name === "slot") return onSlot(root, node)
      if (root.infos[node.name]) return onComponent(root, node)
      return onElement(root, node)
    case "Expression":
    case "Text":
      return onExpressionOrText(root, node)
    case "If":
    case "ElseIf":
      return onIf(root, node)
    case "For":
      return onFor(root, node)
  }
}

/**
 *
 * @param {TransformContext} root
 * @param {AstNodeElement} node
 * @returns {CallExpression | undefined}
 */
function onElement(root, node) {
  assert(node.name !== "template", "Non slot template elements are not allowed")
  if (node.name === "") return onFragment(root, node.children)
  root.elements.add(node.name)
  root.renderers.add("$e")

  const children = onFragment(root, node.children)

  const { attrs, props, events } = onAttributes(root, node)

  const input = objectExpression([])

  if (attrs.length)
    input.properties.push(
      property("init", identifier("attrs"), objectExpression(attrs))
    )
  if (props.length)
    input.properties.push(
      property("init", identifier("props"), objectExpression(props))
    )
  if (events.length)
    input.properties.push(
      property("init", identifier("events"), objectExpression(events))
    )
  if (children)
    input.properties.push(property("init", identifier("child"), children))

  /** @type {CallExpression['arguments']} */
  const callArguments = []

  if (input.properties.length) callArguments.push(input)

  return callExpression(identifier(node.name), callArguments)
}

/**
 * @param {TransformContext} root
 * @param {AstNodeElement} node
 * @returns {Record<'attrs' | 'props' | 'events', Property[]>}
 */
function onAttributes(root, node) {
  const attributes = node.attributes
  /** @type {Property[]} */
  const attrs = []
  /** @type {Property[]} */
  const props = []
  /** @type {Property[]} */
  const events = []

  if (root.info.styles && node.name !== "slot" && node.name !== "template")
    node.attributes.push({
      type: "Attribute",
      kind: "Flag",
      name: generateCssScopeAttribute(root.info.name),
      value: {
        type: "Expression",
        value: { type: "Literal", start: 0, end: 0, value: true }
      }
    })

  for (const attr of attributes) {
    switch (attr.kind) {
      case "Literal":
        attrs.push(
          property("init", literal(attr.name), literal(attr.value.value))
        )
        break
      case "Flag":
        attrs.push(property("init", literal(attr.name), literal("")))
        break
      case "Property":
        props.push(
          property(
            "init",
            literal(attr.name),
            arrowFunctionExpression([], expression(attr.value.value))
          )
        )
        break
      case "Event":
        events.push(
          property("init", literal(attr.name), expression(attr.value.value))
        )
        break
    }
  }

  return { attrs, props, events }
}

/**
 * @param {TransformContext} root
 * @param {AstNodeExpression | AstNodeText} input
 * @returns {CallExpression}
 */
function onExpressionOrText(root, input) {
  root.renderers.add("$t")

  const value =
    input.type === "Text"
      ? literal(input.value)
      : arrowFunctionExpression([], expression(input.value))

  return callExpression(identifier("$t"), [value])
}

/**
 *
 * @param {import("acorn").Expression} value
 * @returns {*}
 */
function expression(value) {
  return value
}

/**
 *
 * @param {TransformContext} root
 * @param {AstNodeIf | AstNodeElseIf} node
 * @return {CallExpression | undefined}
 */
function onIf(root, node) {
  assert(
    node.type === "If",
    "ElseIf nodes are only allowed in elifs of If nodes"
  )

  const then = onFragment(root, node.then)
  assert(then !== undefined, "If node must have a child")

  const elifs = node.elifs ?? []

  const elseIfs = elifs.map(elif => {
    const then = onFragment(root, elif.then)
    assert(then !== undefined, "ElseIf node must have a child")
    return arrayExpression([
      arrowFunctionExpression([], expression(elif.test)),
      then
    ])
  })

  const otherwise = [onFragment(root, node.otherwise ?? [])].filter(
    frag => frag !== undefined
  )

  root.renderers.add("$if")

  return callExpression(identifier("$if"), [
    objectExpression([
      property(
        "init",
        identifier("ifs"),
        arrayExpression([
          arrayExpression([
            arrowFunctionExpression([], expression(node.test)),
            then
          ]),
          ...elseIfs
        ])
      ),
      ...otherwise.map(frag => property("init", identifier("otherwise"), frag))
    ])
  ])
}

/**
 *
 * @param {TransformContext} root
 * @param {AstNodeFor} node
 */
function onFor(root, node) {
  const fragment = onFragment(root, node.children)
  assert(fragment !== undefined, "For node must have a child")

  const item = node.item
  assert(
    item.type === "Identifier",
    "[Transform] for item expression should be an identifier"
  )

  root.renderers.add("$for")

  /** @type {Property[]} */
  const optional = []

  const emptyFragment = onFragment(root, node.empty ?? [])

  if (emptyFragment !== undefined)
    optional.push(property("init", identifier("empty"), emptyFragment))

  return callExpression(identifier("$for"), [
    objectExpression([
      property(
        "init",
        identifier("items"),
        arrowFunctionExpression([], expression(node.items))
      ),
      property(
        "init",
        identifier("trackBy"),
        arrowFunctionExpression([item], expression(node.track))
      ),
      ...optional
    ]),
    arrowFunctionExpression([item], fragment)
  ])
}

/**
 *
 * @param {TransformContext} root
 * @param {AstNodeElement} node
 * @returns {CallExpression}
 */
function onComponent(root, node) {
  const tagName = node.name
  const varName = parseTagNameToVarName(tagName)

  root.components.add(tagName)

  const { attrs, props, events } = onAttributes(root, node)

  const slots = onComponentChild(root, node.children)

  const input = objectExpression([])

  if (attrs.length)
    input.properties.push(
      property("init", identifier("attrs"), objectExpression(attrs))
    )
  if (props.length)
    input.properties.push(
      property("init", identifier("props"), objectExpression(props))
    )
  if (events.length)
    input.properties.push(
      property("init", identifier("events"), objectExpression(events))
    )

  if (slots.properties.length)
    input.properties.push(property("init", identifier("slots"), slots))
  return callExpression(identifier(varName), [input])
}

/**
 *
 * @param {TransformContext} root
 * @param {AstNode[]} nodes
 * @return {ObjectExpression}
 */
function onComponentChild(root, nodes) {
  /** @type {Record<string, [AstNodeAttribute[], AstNode[]][]>} */
  const slots = {}

  for (const node of nodes) {
    if (node.type !== "Element") {
      slots["default"] ??= []
      slots["default"].push([[], [node]])
      continue
    }
    if (node.name !== "template") {
      slots["default"] ??= []
      slots["default"].push([[], [node]])
      continue
    }
    const nameAttr = node.attributes.find(attr => attr.name === "slot")
    const lets = node.attributes.filter(attr =>
      /^let-\w+[\d\w]*/.test(attr.name)
    )

    if (nameAttr === undefined) {
      slots["default"] ??= []
      slots["default"].push([lets, node.children])
      continue
    }

    assert(nameAttr.kind === "Literal", "Slot name must be a literal")

    const name = nameAttr.value.value

    slots[name] ??= []
    slots[name].push([lets, node.children])
  }

  const slotsObject = objectExpression([])

  for (const [slotName, entries] of Object.entries(slots)) {
    /** @type {Set<string>} */
    const slotFnParams = new Set()

    /** @type {CallExpression[]} */
    const fragments = []
    for (const [lets, nodes] of entries) {
      const fragment = onFragment(root, nodes)
      assert(fragment !== undefined, "Slot node must have a child")

      if (lets.length === 0) {
        fragments.push(fragment)
        continue
      }

      const letObject = objectPattern([])

      for (const letAttr of lets) {
        assert(
          letAttr.kind === "Literal",
          "Slot context let attribute must be a literal"
        )
        letObject.properties.push(
          property(
            "init",
            identifier(letAttr.name.replace(/^let-/, "")),
            identifier(letAttr.value.value)
          )
        )
      }

      slotFnParams.add("$$context")

      fragments.push(
        callExpression(arrowFunctionExpression([letObject], fragment), [
          identifier("$$context")
        ])
      )
    }

    const slotFragment = toFragment(root, fragments)
    assert(slotFragment !== undefined, "Slot node must have a child")

    slotsObject.properties.push(
      property(
        "init",
        literal(slotName),
        arrowFunctionExpression(
          Array.from(slotFnParams).map(name => identifier(name)),
          slotFragment
        )
      )
    )
  }

  return slotsObject
}

/**
 *
 * @param {TransformContext} root
 * @param {CallExpression[]} calls
 * @returns {CallExpression | undefined}
 */
function toFragment(root, calls) {
  if (calls.length === 0) return undefined
  if (calls.length === 1) return calls[0]
  root.renderers.add("$f")
  return callExpression(identifier("$f"), calls)
}

/**
 *
 * @param {TransformContext} root
 * @param {AstNodeElement} node
 * @returns {CallExpression}
 */
function onSlot(root, node) {
  root.componentFnParams.add("$$slots")

  const { props } = onAttributes(root, node)

  const nameAttr = node.attributes.find(attr => attr.name === "name")

  const name =
    nameAttr?.value?.type === "Text" ? nameAttr.value.value : "default"

  const call = callExpression(
    memberExpression(identifier("$$slots"), literal(name ?? "default"), true),
    []
  )
  if (props.length > 0) {
    call.arguments.push(objectExpression(props))
  }
  return call
}
