/**
@import { Todo } from "./types.js"
*/

/**
 * @typedef TodoTableProps
 * @property {Todo[]} tasks
 * @property {string} [editId]
 */

/**
 * @typedef TodoTableEvents
 * @property {string} [onremove]
 * @property {string} [onedit]
 * @property {string} [ontoggle]
 */

/**
 *
 * @param {import("@htmly/core").Input<{ props: TodoTableProps, events: TodoTableEvents }>} input
 * @returns
 */
export default function TodoTableController({
  props: { tasks, editId },
  events: { onremove, onedit, ontoggle }
}) {
  return {
    tasks,
    editId,
    /**
     * @param {Event} e
     */
    onremove(e) {
      onremove(getId(e))
    },
    /**
     * @param {Event} e
     */
    onedit(e) {
      onedit(getId(e))
    },
    /**
     * @param {Event} e
     */
    ontoggle(e) {
      ontoggle(getId(e))
    }
  }

  /**
   *
   * @param {Event} e
   * @returns {string}
   */
  function getId(e) {
    const target = /** @type {HTMLButtonElement} */ (e.target)
    return target.value
  }
}
