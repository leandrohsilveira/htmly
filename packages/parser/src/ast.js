/**
 * @param {{ async?: boolean, generator?: boolean, expression?: boolean }} options
 * @param {import("acorn").ArrowFunctionExpression['body']} body
 * @param {...import("acorn").Pattern} params
 * @returns {import("acorn").ArrowFunctionExpression}
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
 * @param {import("acorn").FunctionDeclaration['id']} id
 * @param {import("acorn").FunctionDeclaration['params']} params
 * @param {...import("acorn").BlockStatement['body'][number]} body
 * @returns {import("acorn").FunctionDeclaration}
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
 * @param {import("acorn").FunctionExpression['params']} params
 * @param {import("acorn").FunctionExpression['id']} id
 * @param {...import("acorn").BlockStatement['body'][number]} body
 * @returns {import("acorn").FunctionExpression}
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
 * @param {import("acorn").ReturnStatement['argument']} [argument]
 * @returns {import("acorn").ReturnStatement}
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
 * @param {import("acorn").ImportDeclaration['specifiers']} specifiers
 * @returns {import("acorn").ImportDeclaration}
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
 * @param {import("acorn").Identifier} local
 * @param {import("acorn").Identifier | import("acorn").Literal} [imported]
 * @returns {import("acorn").ImportSpecifier}
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
 * @param {import("acorn").Identifier} local
 * @returns {import("acorn").ImportDefaultSpecifier}
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
 * @param {import("acorn").ExportDefaultDeclaration['declaration']} declaration
 * @returns {import("acorn").ExportDefaultDeclaration}
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
 * @param {import("acorn").Property['key']} key
 * @param {import("acorn").Property['value']} value
 * @returns {import("acorn").Property}
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
 * @param {import("acorn").AssignmentProperty['key']} key
 * @param {import("acorn").AssignmentProperty['value']} value
 * @returns {import("acorn").AssignmentProperty}
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
 * @param {...import("acorn").ObjectExpression['properties'][number]} properties
 * @returns {import("acorn").ObjectExpression}
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
 * @param {...import("acorn").ObjectPattern['properties'][number]} properties
 * @returns {import("acorn").ObjectPattern}
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
 * @param {...import("acorn").ArrayExpression['elements'][number]} elements
 * @returns {import("acorn").ArrayExpression}
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
 * @param {import("acorn").CallExpression['callee']} callee
 * @param {...import("acorn").CallExpression['arguments'][number]} args
 * @returns {import("acorn").CallExpression}
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
 * @param {import("acorn").VariableDeclarator['id']} id
 * @param {import("acorn").VariableDeclarator['init']} [init]
 * @returns {import("acorn").VariableDeclarator}
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
 * @param {import("acorn").VariableDeclaration['kind']} kind
 * @param {...import("acorn").VariableDeclaration['declarations'][number]} declarations
 * @returns {import("acorn").VariableDeclaration}
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
 * @param {import("acorn").MemberExpression['object']} object
 * @param {import("acorn").MemberExpression['property']} property
 * @param {{ computed?: boolean, optional?: boolean}} [options]
 * @returns {import("acorn").MemberExpression}
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
 * @returns {import("acorn").Identifier}
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
 * @returns {import("acorn").Literal}
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
