/**
@import { Component, ControllerInput } from "@htmly/core"
*/
import { controller } from "@htmly/core"

/**
 * @template T
 * @typedef TableProps
 * @property {T[]} items
 * @property {(item: T) => string} trackBy
 */

/**
 * @template T
 * @typedef TableSlots
 * @property {T} item
 * @property {void} [header]
 * @property {void} [empty]
 * @property {void} [footer]
 */

/**
 * @template T
 * @param {ControllerInput<{ props: TableProps<T>, slots: TableSlots<T>}>} input
 * @returns
 */
function TableController({ props: { items, trackBy }, slots: { footer } }) {
  console.log("TableController", items())
  return {
    items,
    trackBy,
    hasFooter: footer
  }
}

/**
 * @template T
 * @type {Component<{ props: TableProps<T>, slots: TableSlots<T>}>}
 */
export default controller(TableController)
