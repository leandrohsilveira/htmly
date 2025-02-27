/**
@import { ComponentInfo } from "./types.js"
*/
import * as csstree from "css-tree"

/**
 * @typedef TransformStyleContext
 * @property {ComponentInfo} info
 */

/**
 * @param {string} input
 * @param {string} scope
 * @return {string}
 */
export function scopeCss(input, scope) {
  const ast = csstree.parse(input)
  const selector = csstree.parse(`[${scope}]`, { context: "selector" })
  csstree.walk(ast, function (node, item, list) {
    switch (node.type) {
      case "Raw":
        const replace = csstree.parse(node.value, { context: "selector" })
        list.replace(item, list.createItem(replace))
        break
      case "PseudoClassSelector":
        if (item.prev) {
          list.insert(list.createItem(selector), item)
        }
        break
      case "PseudoElementSelector":
      case "Combinator":
        list.insert(list.createItem(selector), item)
        return this.skip
      case "AttributeSelector":
        if (!item.next && node.name.name === scope) return this.skip
      case "ClassSelector":
      case "IdSelector":
      case "TypeSelector":
        if (!item.next) {
          list.append(list.createItem(selector))
          return this.skip
        }
        break
    }
  })

  return csstree.generate(ast)
}
