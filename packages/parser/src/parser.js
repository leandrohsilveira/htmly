import { parseExpressionAt } from "acorn"
import { genLiteral } from "./ast.js"

/**
 *
 * @param {string} content
 * @returns {import("./types.js").Ast}
 */
export function parseAst(content) {
  let i = 0

  const ast = {
    html: parseFragments(() => i < content.length)
  }

  return ast

  /**
   *
   * @param {() => boolean} condition
   */
  function parseFragments(condition) {
    /** @type {import("./types.js").AstNode[]} */
    const fragments = []

    while (condition()) {
      skipWhitespace()
      const remaining = content.substring(i)
      const fragment = parseFragment()
      if (fragment) fragments.push(fragment)
      skipWhitespace()
    }

    return fragments
  }

  /**
   * @returns {import("./types.js").AstNode | undefined}
   */
  function parseFragment() {
    return (
      parseElement() ??
      parseExpression() ??
      parseIf() ??
      parseFor() ??
      parseText()
    )
  }

  /**
   *
   * @returns {import("./types.js").AstNodeElement | undefined}
   */
  function parseElement() {
    if (match("<")) {
      eat("<")
      const tagName = readWhileMatching(/[A-z0-9\-\_]/)
      const attributes = parseAttributeList()
      /** @type {import("./types.js").AstNode[]} */
      let children = []
      if (match("/>")) {
        eat("/>")
      } else {
        eat(">")
        const endTag = `</${tagName}>`
        children = parseFragments(() => !match(endTag))
        eat(endTag)
      }
      return {
        type: "Element",
        name: tagName,
        attributes,
        children
      }
    }
  }

  function parseAttributeList() {
    /** @type {import("./types.js").AstNodeAttribute[]} */
    const attributes = []
    skipWhitespace()
    while (!match(">") && !match("/>")) {
      attributes.push(parseAttribute())
      skipWhitespace()
    }
    return attributes
  }

  /**
   *
   * @returns {import("./types.js").AstNodeAttribute}
   */
  function parseAttribute() {
    const name = readWhileMatching(/[^=\s\n]/)
    if (match('="')) {
      eat('="')
      skipWhitespace()
      if (/^[\(\[].*[\)\]]$/.test(name)) {
        const value = parseJavaScript(/[^"]/)
        eat('"')
        return {
          type: "Attribute",
          name: name.replace(/^[\(\[]|[\]\)]$/g, ""),
          kind: /^\[.*\]$/.test(name) ? "Property" : "Event",
          value: {
            type: "Expression",
            value
          }
        }
      }
      const value = readWhileMatching(/[^"]/)
      eat('"')
      return {
        type: "Attribute",
        name,
        kind: "Literal",
        value: {
          type: "Text",
          value
        }
      }
    } else {
      skipWhitespace()
      return {
        type: "Attribute",
        name,
        kind: "Flag",
        value: {
          type: "Expression",
          value: genLiteral(true)
        }
      }
    }
  }

  /**
   * @returns {import("./types.js").AstNodeIf | undefined}
   */
  function parseIf() {
    if (match("@if")) {
      eat("@if")
      skipWhitespace()
      eat("(")
      const test = parseJavaScript()
      eat(")")
      skipWhitespace()
      eat("{")
      skipWhitespace()
      const then = parseFragments(() => !match("}"))
      eat("}")
      /** @type {import("./types.js").AstNode[]} */
      let otherwise = []
      /** @type {import("./types.js").AstNodeIf[]} */
      let elifs = []
      skipWhitespace()
      while (match("@else")) {
        eat("@else")
        skipWhitespace()
        if (match("if")) {
          eat("if")
          skipWhitespace()
          eat("(")
          const test = parseJavaScript()
          eat(")")
          skipWhitespace()
          eat("{")
          const then = parseFragments(() => !match("}"))
          eat("}")
          skipWhitespace()
          elifs.push({
            type: "If",
            test,
            then,
            otherwise: [],
            elifs: []
          })
        } else {
          eat("{")
          skipWhitespace()
          otherwise = parseFragments(() => !match("}"))
          eat("}")
          skipWhitespace()
        }
      }
      return {
        type: "If",
        test,
        then,
        elifs,
        otherwise
      }
    }
  }

  /**
   * @returns {import("./types.js").AstNodeFor | undefined}
   */
  function parseFor() {
    if (match("@for")) {
      eat("@for")
      skipWhitespace()
      eat("(")
      skipWhitespace()
      const item = parseJavaScript(() => !match("of"))
      skipWhitespace()
      eat("of")
      skipWhitespace()
      const items = parseJavaScript(
        remaining => !/^[\s\n]?\)[\s\n]?track[\s\n]?\(/.test(remaining)
      )
      skipWhitespace()
      eat(")")
      skipWhitespace()
      eat("track")
      skipWhitespace()
      eat("(")
      skipWhitespace()
      const track = parseJavaScript(
        remaining => !/^[\s\n]?\)[\s\n]?\{/.test(remaining)
      )
      eat(")")
      skipWhitespace()
      eat("{")
      skipWhitespace()
      const children = parseFragments(() => !match("}"))
      eat("}")
      return {
        type: "For",
        item,
        items,
        track,
        children
      }
    }
  }

  /**
   *
   * @returns {import("./types.js").AstNodeExpression | undefined}
   */
  function parseExpression() {
    if (match("{{")) {
      eat("{{")
      const value = parseJavaScript()
      eat("}}")
      return {
        type: "Expression",
        value
      }
    }
  }

  /**
   *
   * @returns {import("./types.js").AstNodeText | undefined}
   */
  function parseText() {
    skipWhitespace()
    const value = readWhileMatching(
      () =>
        !match("<") &&
        !match("{{") &&
        !match("@if") &&
        !match("@for") &&
        !match("}")
    )
    if (value.trim() !== "") {
      return {
        type: "Text",
        value
      }
    }
  }

  /**
   * @param {RegExp | ((remaining: string) => boolean)} [condition]
   * @returns {import("acorn").Expression}
   */
  function parseJavaScript(condition) {
    const start = i
    let contentToParse = content
    if (condition) {
      const fragment = readWhileMatching(condition)
      const contentUntil = content.substring(0, start)
      contentToParse = contentUntil + fragment
    }
    const js = parseExpressionAt(contentToParse, start, { ecmaVersion: 2022 })
    i = js.end
    return js
  }

  /**
   * @param {RegExp} matcher
   * @param {number} len
   */
  /**
   * @param {string} matcher
   */
  /**
   * @param {string | RegExp} matcher
   * @param {number} [len]
   */
  function match(matcher, len = 1) {
    if (typeof matcher === "string")
      return content.slice(i, i + matcher.length) === matcher
    return matcher.test(content.slice(i, i + len))
  }

  /**
   *
   * @param {string} str
   */
  function eat(str) {
    if (match(str)) {
      i += str.length
    } else {
      throw new Error(`Parser error: expecting "${str}"`)
    }
  }

  /**
   *
   * @param {RegExp | ((remaining: string) => boolean)} matcher
   */
  function readWhileMatching(matcher) {
    let startingIndex = i
    while (test() && i <= content.length) {
      i++
    }
    return content.slice(startingIndex, i)

    function test() {
      return typeof matcher === "function"
        ? matcher(content.substring(i))
        : matcher.test(content[i])
    }
  }

  function skipWhitespace() {
    readWhileMatching(/[\s\n]/)
  }
}
