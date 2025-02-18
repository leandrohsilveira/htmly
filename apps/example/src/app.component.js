import { component } from "@htmly/core"
import { computed, signal } from "alien-signals"

export const name = "app"

export default component(() => {
  const count = signal(0)
  const sort = signal("asc")
  const items = computed(() =>
    Array.from({ length: count() })
      .map((_, index) => `Item ${index}`)
      .sort((a, b) =>
        sort() === "asc" ? a.localeCompare(b) : b.localeCompare(a)
      )
  )
  return {
    title: "Teste",
    items,
    count,
    /**
     *
     * @param {Event} e
     */
    increment(e) {
      e.preventDefault()
      count(count() + 1)
    },
    /**
     *
     * @param {Event} e
     */
    decrement(e) {
      e.preventDefault()
      count(count() - 1)
    },
    toggleSort() {
      sort(sort() === "asc" ? "desc" : "asc")
    },
    /**
     *
     * @param {Event} e
     */
    handleInput(e) {
      const target = /** @type {HTMLInputElement} */ (e.target)
      const value = Number(target.value)
      if (Number.isNaN(value)) return
      count(value)
    }
  }
})
