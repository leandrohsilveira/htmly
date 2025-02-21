/** 
@import { ControllerInput } from "@htmly/core"
@import { Todo } from "./types.js"
*/
import { controller, computed } from "@htmly/core"

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
 * @param {ControllerInput<{ props: TodoFormProps, events: TodoFormEvents }>} input
 */
export function TodoFormController({
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
    oncancel() {
      oncancel()
    }
  }
}

export default controller(TodoFormController)
