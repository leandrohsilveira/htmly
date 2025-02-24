/**
@import {
  AstNode,
  AstNodeElement,
  AstNodeText,
  AstNodeExpression,
  AstNodeAttribute,
  AstNodeIf,
  AstNodeFor,
  AstNodeElseIf
} from "./types.js"
@import { Expression } from "acorn"
*/
import { assert } from "@htmly/core"
import { parseExpressionAt } from "acorn"

/**
 *
 * @param {string} content
 * @returns {AstNode[]}
 */
export function parseAst(content) {
  let i = 0

  return parseFragments(() => i < content.length)

  /**
   *
   * @param {() => boolean} condition
   */
  function parseFragments(condition) {
    /** @type {AstNode[]} */
    const fragments = []

    while (condition()) {
      skipWhitespace()
      const fragment = parseFragment()
      if (fragment) fragments.push(fragment)
      skipWhitespace()
    }

    return fragments
  }

  /**
   * @returns {AstNode | undefined}
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
   * @returns {AstNodeElement | undefined}
   */
  function parseElement() {
    if (match("<")) {
      eat("<")
      const tagName = readWhileMatching(/[A-z0-9\-\_]/)
      const attributes = parseAttributeList()
      /** @type {AstNode[]} */
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
    /** @type {AstNodeAttribute[]} */
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
   * @returns {AstNodeAttribute}
   */
  function parseAttribute() {
    const name = readWhileMatching(/[^=\s\n>]/)
    if (match('="')) {
      eat('="')
      skipWhitespace()
      if (/^[\(\[].*[\)\]]$/.test(name)) {
        const value = parseJavaScript(/[^"]/)
        if (match(')"')) eat(')"')
        else eat('"')
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
          value: {
            type: "Literal",
            start: 0,
            end: 0,
            value: true,
            raw: "true"
          }
        }
      }
    }
  }

  /**
   * @returns {AstNodeIf | undefined}
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
      /** @type {AstNode[]} */
      let otherwise = []
      /** @type {AstNodeElseIf[]} */
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
            type: "ElseIf",
            test,
            then
          })
        } else {
          eat("{")
          skipWhitespace()
          otherwise = parseFragments(() => !match("}"))
          eat("}")
          skipWhitespace()
        }
      }

      /** @type {AstNodeIf} */
      const result = {
        type: "If",
        test,
        then
      }

      if (elifs.length) result.elifs = elifs
      if (otherwise.length) result.otherwise = otherwise

      return result
    }
  }

  /**
   * @returns {AstNodeFor | undefined}
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
        remaining => !/^[\s\n]?;[\s\n]?track[\s\n]/.test(remaining)
      )
      skipWhitespace()
      eat(";")
      skipWhitespace()
      eat("track")
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
      skipWhitespace()
      /** @type {AstNode[]} */
      let empty = []
      if (match("@empty")) {
        eat("@empty")
        skipWhitespace()
        eat("{")
        skipWhitespace()
        empty = parseFragments(() => !match("}"))
        skipWhitespace()
        eat("}")
      }
      /** @type {AstNodeFor} */
      const result = {
        type: "For",
        item,
        items,
        track,
        children
      }
      if (empty.length) result.empty = empty
      return result
    }
  }

  /**
   *
   * @returns {AstNodeExpression | undefined}
   */
  function parseExpression() {
    if (match("{{")) {
      eat("{{")
      skipWhitespace()
      const value = parseJavaScript()
      skipWhitespace()
      eat("}}")
      return {
        type: "Expression",
        value
      }
    }
  }

  /**
   *
   * @returns {AstNodeText | undefined}
   */
  function parseText() {
    skipWhitespace()
    const value = readWhileMatching(
      sub => !/^(\n+[\n\s]*)?([<}]|[{]{2}|\@(if|for))/.test(sub)
    )
    skipWhitespace()
    if (value.trim() !== "") {
      return {
        type: "Text",
        value
      }
    }
  }

  /**
   * @param {RegExp | ((remaining: string) => boolean)} [condition]
   * @returns {Expression}
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
    assert(match(str), `Parser error: expecting "${str}"`)
    i += str.length
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
