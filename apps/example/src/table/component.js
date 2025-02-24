/**
@import { Component, Input, ReadableSignal } from "@htmly/core"
*/
/**
 * @template T
 * @typedef TableProps
 * @property {T[]} items
 * @property {(item: T) => string} trackBy
 */

/**
 * @template T
 * @typedef TableSlots
 * @property {{ item: T }} item
 * @property {void} [header]
 * @property {void} [empty]
 * @property {void} [footer]
 */

/**
 * @template T
 * @param {Input<{ props: TableProps<T>, slots: TableSlots<T>}>} input
 * @returns
 */
export default function TableController({
  props: { items, trackBy },
  slots: { footer }
}) {
  return {
    items,
    trackBy,
    hasFooter: footer
  }
}
