import { assert, component, computed, signal } from "@htmly/core"

/**
 * @typedef Task
 * @property {string} id
 * @property {string} name
 * @property {boolean} done
 */

/** @type {import("@htmly/core").Signal<Task[]>} */
const allTasks = signal([])

export const name = "app"

export default component(() => {
  const tasks = computed(() => allTasks())

  /** @type {import("@htmly/core").Signal<Task | null>} */
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
     * @param {Event} e
     */
    onsubmit(e) {
      e.preventDefault()
      const target = /** @type {HTMLFormElement} */ (e.target)
      const input = /** @type {HTMLInputElement} */ (
        target.elements.namedItem("name")
      )
      const name = input.value
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
        input.value = ""
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
})
