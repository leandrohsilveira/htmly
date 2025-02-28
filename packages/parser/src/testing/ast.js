/**
@import {
  Expression,
  Statement,
  Pattern,
  BlockStatement,
  ArrowFunctionExpression,
  FunctionDeclaration,
  FunctionExpression,
  Identifier,
  Literal,
  ReturnStatement,
  ImportDeclaration,
  ImportSpecifier,
  ImportDefaultSpecifier,
  ExportDefaultDeclaration,
  Property,
  AssignmentProperty,
  ObjectExpression,
  ObjectPattern,
  ArrayExpression,
  CallExpression,
  VariableDeclarator,
  VariableDeclaration,
  MemberExpression,
  PrivateIdentifier,
  AnyNode
} from "acorn"
@import { Node } from "estree"
@import { AstNode, AstNodeAttribute } from "../types.js"
*/
import { walk } from "estree-walker"
import { expect } from "vitest"

/** @typedef {AstNode['type'] | AnyNode['type'] | AstNodeAttribute['type']} NodeTypes */

/**
 * @typedef AstHelperFinderOptions
 * @property {NodeTypes | null} [parent]
 * @property {string} [key]
 * @property {number} [index]
 */

/**
 * @typedef AstHelper
 * @property {(type: NodeTypes, options?: AstHelperFinderOptions ) => AstHelperChild} find
 */

/**
 * @typedef {AstHelper & { value: AstNode | Node | null }} AstHelperChild
 */

/** @type {{ [K in NodeTypes]: K }} */
export const t = {
  Attribute: "Attribute",
  Expression: "Expression",
  Literal: "Literal",
  Program: "Program",
  SwitchCase: "SwitchCase",
  CatchClause: "CatchClause",
  Property: "Property",
  Super: "Super",
  SpreadElement: "SpreadElement",
  TemplateElement: "TemplateElement",
  ObjectPattern: "ObjectPattern",
  ArrayPattern: "ArrayPattern",
  RestElement: "RestElement",
  AssignmentPattern: "AssignmentPattern",
  ClassBody: "ClassBody",
  MethodDefinition: "MethodDefinition",
  MetaProperty: "MetaProperty",
  ImportAttribute: "ImportAttribute",
  ImportSpecifier: "ImportSpecifier",
  ImportDefaultSpecifier: "ImportDefaultSpecifier",
  ImportNamespaceSpecifier: "ImportNamespaceSpecifier",
  ExportSpecifier: "ExportSpecifier",
  PropertyDefinition: "PropertyDefinition",
  PrivateIdentifier: "PrivateIdentifier",
  StaticBlock: "StaticBlock",
  VariableDeclarator: "VariableDeclarator",
  ArrayExpression: "ArrayExpression",
  ArrowFunctionExpression: "ArrowFunctionExpression",
  AssignmentExpression: "AssignmentExpression",
  AwaitExpression: "AwaitExpression",
  BinaryExpression: "BinaryExpression",
  BlockStatement: "BlockStatement",
  BreakStatement: "BreakStatement",
  CallExpression: "CallExpression",
  ChainExpression: "ChainExpression",
  ClassDeclaration: "ClassDeclaration",
  ClassExpression: "ClassExpression",
  ConditionalExpression: "ConditionalExpression",
  ContinueStatement: "ContinueStatement",
  DebuggerStatement: "DebuggerStatement",
  DoWhileStatement: "DoWhileStatement",
  Element: "Element",
  ElseIf: "ElseIf",
  EmptyStatement: "EmptyStatement",
  ExportAllDeclaration: "ExportAllDeclaration",
  ExportDefaultDeclaration: "ExportDefaultDeclaration",
  ExportNamedDeclaration: "ExportNamedDeclaration",
  ExpressionStatement: "ExpressionStatement",
  For: "For",
  ForInStatement: "ForInStatement",
  ForOfStatement: "ForOfStatement",
  ForStatement: "ForStatement",
  FunctionDeclaration: "FunctionDeclaration",
  FunctionExpression: "FunctionExpression",
  Identifier: "Identifier",
  If: "If",
  IfStatement: "IfStatement",
  ImportDeclaration: "ImportDeclaration",
  ImportExpression: "ImportExpression",
  LabeledStatement: "LabeledStatement",
  LogicalExpression: "LogicalExpression",
  MemberExpression: "MemberExpression",
  NewExpression: "NewExpression",
  ObjectExpression: "ObjectExpression",
  ParenthesizedExpression: "ParenthesizedExpression",
  ReturnStatement: "ReturnStatement",
  SequenceExpression: "SequenceExpression",
  SwitchStatement: "SwitchStatement",
  TaggedTemplateExpression: "TaggedTemplateExpression",
  TemplateLiteral: "TemplateLiteral",
  Text: "Text",
  ThisExpression: "ThisExpression",
  ThrowStatement: "ThrowStatement",
  TryStatement: "TryStatement",
  UnaryExpression: "UnaryExpression",
  UpdateExpression: "UpdateExpression",
  VariableDeclaration: "VariableDeclaration",
  WhileStatement: "WhileStatement",
  WithStatement: "WithStatement",
  YieldExpression: "YieldExpression"
}

/**
 *
 * @param {AstNode[] | AnyNode} nodes
 * @returns {AstHelper}
 */
export function astHelper(nodes) {
  return {
    find(type, { parent, key, index } = {}) {
      /** @type {*} */
      let resolved = null

      walk(/** @type {*} */ (nodes), {
        enter(node, _parent, _key, _index) {
          if (resolved) return this.skip()
          if (
            node.type === type &&
            (parent === undefined || (_parent?.type ?? null) === parent) &&
            (key === undefined || (key ?? null) === (_key ?? null)) &&
            (index === undefined || (index ?? null) === (_index ?? null))
          ) {
            resolved = node
            return this.skip()
          }
        },
        leave() {
          if (resolved) return this.skip()
        }
      })

      if (resolved) {
        return {
          value: resolved,
          find: astHelper(resolved).find
        }
      }
      return {
        value: `Resolution failed at: [type: ${type}, ${JSON.stringify({ parent, key, index })}]\n\n${JSON.stringify(nodes, null, 2)}`,
        find() {
          return this
        }
      }
    }
  }
}

/**
 *
 * @param {*} exp
 */
export function gen({ start, end, ...obj }) {
  return expect.objectContaining(obj)
}

/**
 *
 * @param {Expression | PrivateIdentifier} property
 * @returns
 */
export function genThisCallExpression(property) {
  return gen(
    genCallExpression(
      gen(genMemberExpression(gen({ type: "ThisExpression" }), gen(property)))
    )
  )
}

/**
 * @param {{ async?: boolean, generator?: boolean, expression?: boolean }} options
 * @param {ArrowFunctionExpression['body']} body
 * @param {...Pattern} params
 * @returns {ArrowFunctionExpression}
 */
export function genArrowFunction(
  { async, generator, expression },
  body,
  ...params
) {
  return {
    type: "ArrowFunctionExpression",
    start: 0,
    end: 0,
    async: async ?? false,
    generator: generator ?? false,
    expression: expression ?? false,
    params,
    body
  }
}

/**
 * @param {{ async?: boolean, generator?: boolean, expression?: boolean }} options
 * @param {FunctionDeclaration['id']} id
 * @param {FunctionDeclaration['params']} params
 * @param {...BlockStatement['body'][number]} body
 * @returns {FunctionDeclaration}
 */
export function genFunction(
  { async, generator, expression },
  id,
  params,
  ...body
) {
  return {
    type: "FunctionDeclaration",
    start: 0,
    end: 0,
    async: async ?? false,
    generator: generator ?? false,
    expression: expression ?? false,
    id,
    params,
    body: {
      type: "BlockStatement",
      start: 0,
      end: 0,
      body
    }
  }
}

/**
 * @param {{ async?: boolean, generator?: boolean, expression?: boolean }} options
 * @param {FunctionExpression['params']} params
 * @param {FunctionExpression['id']} id
 * @param {...BlockStatement['body'][number]} body
 * @returns {FunctionExpression}
 */
export function genFunctionExpression(
  { async, generator, expression },
  id,
  params,
  ...body
) {
  return {
    type: "FunctionExpression",
    start: 0,
    end: 0,
    async: async ?? false,
    generator: generator ?? false,
    expression: expression ?? false,
    id,
    params,
    body: {
      type: "BlockStatement",
      start: 0,
      end: 0,
      body
    }
  }
}

/**
 * @param {ReturnStatement['argument']} [argument]
 * @returns {ReturnStatement}
 */
export function genReturn(argument) {
  return {
    type: "ReturnStatement",
    start: 0,
    end: 0,
    argument
  }
}

/**
 *
 * @param {string} source
 * @param {ImportDeclaration['specifiers']} specifiers
 * @returns {ImportDeclaration}
 */
export function genImportDeclaration(source, ...specifiers) {
  return {
    type: "ImportDeclaration",
    start: 0,
    end: 0,
    source: genLiteral(source),
    attributes: [],
    specifiers
  }
}

/**
 *
 * @param {Identifier} local
 * @param {Identifier | Literal} [imported]
 * @returns {ImportSpecifier}
 */
export function genImportSpecifier(local, imported = local) {
  return {
    type: "ImportSpecifier",
    start: 0,
    end: 0,
    local,
    imported
  }
}

/**
 * @param {Identifier} local
 * @returns {ImportDefaultSpecifier}
 */
export function genImportDefaultSpecifier(local) {
  return {
    type: "ImportDefaultSpecifier",
    start: 0,
    end: 0,
    local
  }
}

/**
 * @param {ExportDefaultDeclaration['declaration']} declaration
 * @returns {ExportDefaultDeclaration}
 */
export function genDefaultExport(declaration) {
  return {
    type: "ExportDefaultDeclaration",
    start: 0,
    end: 0,
    declaration
  }
}

/**
 * @param {Property['key']} key
 * @param {Property['value']} value
 * @returns {Property}
 */
export function genProperty(key, value) {
  return {
    type: "Property",
    start: 0,
    end: 0,
    key,
    value,
    computed: false,
    kind: "init",
    method: false,
    shorthand:
      key.type === "Identifier" &&
      value.type === "Identifier" &&
      key.name === value.name
  }
}

/**
 * @param {AssignmentProperty['key']} key
 * @param {AssignmentProperty['value']} value
 * @returns {AssignmentProperty}
 */
export function genAssignmentProperty(key, value) {
  return {
    type: "Property",
    start: 0,
    end: 0,
    key,
    value,
    computed: false,
    kind: "init",
    method: false,
    shorthand:
      key.type === "Identifier" &&
      value.type === "Identifier" &&
      key.name === value.name
  }
}

/**
 * @param {...ObjectExpression['properties'][number]} properties
 * @returns {ObjectExpression}
 */
export function genObjectExpression(...properties) {
  return {
    type: "ObjectExpression",
    start: 0,
    end: 0,
    properties
  }
}

/**
 * @param {...ObjectPattern['properties'][number]} properties
 * @returns {ObjectPattern}
 */
export function genObjectPattern(...properties) {
  return {
    type: "ObjectPattern",
    start: 0,
    end: 0,
    properties
  }
}

/**
 * @param {...ArrayExpression['elements'][number]} elements
 * @returns {ArrayExpression}
 */
export function genArrayExpression(...elements) {
  return {
    type: "ArrayExpression",
    start: 0,
    end: 0,
    elements
  }
}

/**
 * @param {CallExpression['callee']} callee
 * @param {...CallExpression['arguments'][number]} args
 * @returns {CallExpression}
 */
export function genCallExpression(callee, ...args) {
  return {
    type: "CallExpression",
    start: 0,
    end: 0,
    optional: false,
    callee,
    arguments: args
  }
}

/**
 * @param {VariableDeclarator['id']} id
 * @param {VariableDeclarator['init']} [init]
 * @returns {VariableDeclarator}
 */
export function genVariableDeclarator(id, init) {
  return {
    type: "VariableDeclarator",
    start: 0,
    end: 0,
    id,
    init
  }
}

/**
 * @param {VariableDeclaration['kind']} kind
 * @param {...VariableDeclaration['declarations'][number]} declarations
 * @returns {VariableDeclaration}
 */
export function genVariableDeclaration(kind, ...declarations) {
  return {
    type: "VariableDeclaration",
    start: 0,
    end: 0,
    kind,
    declarations
  }
}

/**
 * @param {MemberExpression['object']} object
 * @param {MemberExpression['property']} property
 * @param {{ computed?: boolean, optional?: boolean}} [options]
 * @returns {MemberExpression}
 */
export function genMemberExpression(
  object,
  property,
  { computed = false, optional = false } = {}
) {
  return {
    type: "MemberExpression",
    start: 0,
    end: 0,
    computed,
    optional,
    object,
    property
  }
}

/**
 *
 * @param {string} name
 * @returns {Identifier}
 */
export function genIdentifier(name) {
  return {
    type: "Identifier",
    start: 0,
    end: 0,
    name
  }
}

/**
 *
 * @param {string | number | bigint | boolean | RegExp | null | undefined} value
 * @returns {Literal}
 */
export function genLiteral(value) {
  return {
    type: "Literal",
    start: 0,
    end: 0,
    value,
    raw: JSON.stringify(value)
  }
}

/**
 *
 * @param {RegExp} value
 * @returns {Literal}
 */
export function genRegex(value) {
  return {
    type: "Literal",
    start: 0,
    end: 0,
    regex: {
      pattern: value.source,
      flags: value.flags
    }
  }
}
