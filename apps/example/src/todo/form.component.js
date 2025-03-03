/** 
@import { Input } from "@htmly/core"
@import { Todo } from "./types.js"
*/
import { computed, effect, signal } from "@htmly/core"

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
  const isEdit = computed(() => !!value())

  const name = signal("")

  const dirty = signal(false)

  effect(() => {
    const _name = value()?.name
    if (_name) {
      name.set(_name)
      dirty.set(false)
    }
  })

  return {
    todo: value,
    isEdit,
    value,
    name,
    error: computed(() => (name() ? null : "Name is required")),
    dirty,
    /**
     * @param {Event} e
     */
    onsubmit(e) {
      e.preventDefault()
      onsubmit({ name: name() })
      name.set("")
      dirty.set(false)
    },
    /**
     * @param {Event} e
     */
    oninput(e) {
      const input = /** @type {HTMLInputElement} */ (e.target)
      name.set(input.value)
      dirty.set(true)
    },
    oncancel() {
      name.set("")
      dirty.set(false)
      oncancel()
    }
  }
}
