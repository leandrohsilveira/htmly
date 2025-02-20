import { assert, component, computed, signal } from "@htmly/core"

/**
 * @typedef {{}} AppInput
 */

/** @type {import("@htmly/core").Signal<import("./todo/types.js").Todo[]>} */
const allTasks = signal([])

export const name = "app"

function Controller() {
  const tasks = computed(() => allTasks())

  /** @type {import("@htmly/core").Signal<import("./todo/types.js").Todo | null>} */
  const editTask = signal(null)

  return {
    tasks,
    editTask,

    /**
     *
     * @param {Event} e
     */
    ontoggle(e) {
      e.preventDefault()
      const target = /** @type {HTMLButtonElement} */ (e.target)
      const id = target.value
      allTasks.set(
        allTasks().map(task => {
          if (task.id === id) {
            return {
              ...task,
              done: !task.done
            }
          }
          return task
        })
      )
    },
    /**
     *
     * @param {Pick<import("./todo/types.js").Todo, 'name'>} payload
     */
    onsubmit({ name }) {
      assert(typeof name === "string", "Name is required")
      try {
        if (editTask() === null)
          return allTasks.set([
            ...allTasks(),
            {
              id: crypto.randomUUID(),
              name,
              done: false
            }
          ])
        return allTasks.set(
          allTasks().map(task => {
            if (task.id === editTask()?.id) {
              return {
                ...task,
                name
              }
            }
            return task
          })
        )
      } finally {
        editTask.set(null)
      }
    },
    /**
     *
     * @param {Event} e
     */
    onedit(e) {
      e.preventDefault()
      const target = /** @type {HTMLButtonElement} */ (e.target)
      const id = target.value
      editTask.set(allTasks().find(item => item.id === id) ?? null)
    },
    /**
     *
     * @param {Event} e
     */
    onremove(e) {
      e.preventDefault()
      const target = /** @type {HTMLButtonElement} */ (e.target)
      const id = target.value
      allTasks.set(allTasks().filter(item => item.id !== id))
    },

    oncancel() {
      editTask.set(null)
    }
  }
}

export default component(Controller)
