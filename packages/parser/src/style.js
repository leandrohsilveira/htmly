/**
@import { Rule, Comment, AtRule, Stylesheet } from "css"
@import { ComponentInfo } from "./types.js"
*/
import { assert } from "@htmly/core"
import css from "css"

/**
 *
 * @param {string} name
 * @returns {string}
 */
export function generateCssScopeAttribute(name) {
  return `_htmly_${name}_element`
}

/**
 * @typedef TransformStyleContext
 * @property {ComponentInfo} info
 */

/**
 * @param {string} input
 * @param {ComponentInfo} info
 * @return {{ code: string, ast: Stylesheet }}
 */
export function transformCss(input, info) {
  const ast = css.parse(input)

  /** @type {TransformStyleContext} */
  const root = {
    info
  }

  assert(ast.stylesheet !== undefined, "Stylesheet file shouldn't be undefined")

  onRules(root, ast.stylesheet.rules)

  return {
    code: css.stringify(ast),
    ast
  }
}

/**
 * @param {TransformStyleContext} root
 * @param {(Rule | Comment | AtRule)[]} rules
 */
function onRules(root, rules) {
  for (const rule of rules) {
    onRuleOrCommentOrAtRule(root, rule)
  }
}

/**
 * @param {TransformStyleContext} root
 * @param {Rule | Comment | AtRule} rule
 */
function onRuleOrCommentOrAtRule(root, rule) {
  switch (rule.type) {
    case "rule":
    case "page":
      return onRule(root, rule)
    case "document":
    case "host":
    case "media":
    case "supports":
      if (!rule.rules) return
      return onRules(root, rule.rules)
  }
}

/**
 *
 * @param {TransformStyleContext} root
 * @param {Pick<Rule, 'selectors'>} rule
 */
function onRule(root, rule) {
  if (!rule.selectors?.length) return
  const scopeAttr = generateCssScopeAttribute(root.info.name)
  rule.selectors = rule.selectors.map(selector =>
    selector
      .split(" ")
      .map(token => `${token}[${scopeAttr}]`)
      .join(" ")
  )
}
