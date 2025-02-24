/** 
@import { Input } from "@htmly/core"
@import { Todo } from "./types.js"
*/
import { computed } from "@htmly/core"

/**
 * @typedef TodoFormProps
 * @property {Todo | null} [value]
 */

/**
 * @typedef TodoFormEvents
 * @property {Pick<Todo, 'name'>} onsubmit
 * @property {void} oncancel
 */

/**
 *
 * @param {Input<{ props: TodoFormProps, events: TodoFormEvents }>} input
 */
export default function TodoFormController({
  props: { value },
  events: { onsubmit, oncancel }
}) {
  const edit = computed(() => !!value())
  return {
    edit,
    value,
    /**
     * @param {Event} e
     */
    onsubmit(e) {
      e.preventDefault()
      const form = /** @type {HTMLFormElement} */ (e.target)
      const input = /** @type {HTMLInputElement} */ (
        form.elements.namedItem("name")
      )
      const name = input.value
      onsubmit({ name })
      input.value = ""
    },
    oncancel
  }
}
