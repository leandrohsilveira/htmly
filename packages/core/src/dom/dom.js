import { render as _render } from "../renderer/index.js"
import { assert } from "../util/assert.js"

/**
 * @type {import("../renderer/types.js").Renderer<Element, Text, (e: Event) => void>}
 */
const domRenderer = {
  mount,
  unmount,
  isAfter,
  create(name) {
    return document.createElement(name)
  },
  createText(initial) {
    return document.createTextNode(initial)
  },
  setText(text, ref) {
    ref.data = text
  },
  setProperty(name, value, ref) {
    if (name === "value" && "value" in ref) {
      ref.value = value
      return
    }
    ref.setAttribute(name, String(value))
  },
  subscribeEvent(name, listener, ref) {
    const evtName = name.replace(/^on/, "")
    ref.addEventListener(evtName, listener)

    return () => ref.removeEventListener(evtName, listener)
  },
  replace(container, replacers, targets) {
    unmount(replacers, container)
    const [firstTarget, ...others] = targets
    assert(
      firstTarget !== undefined,
      "renderer.replace function requires at least one target"
    )
    firstTarget.replaceWith(...replacers)
    unmount(others, container)
  }
}

/**
 *
 * @param {(Element | Text)[]} refs
 * @param {Element} target
 * @param {Element | Text} [after]
 * @returns {Element | Text | undefined}
 */
function mount(refs, target, after) {
  if (after) {
    if (!isAfter(refs, after)) {
      after.after(...refs)
    }
    return refs[refs.length - 1]
  } else {
    target.prepend(...refs)
  }
}

/**
 *
 * @param {(Element | Text)[]} refs
 * @param {Element} target
 */
function unmount(refs, target) {
  for (const ref of refs) {
    if (target.contains(ref)) {
      target.removeChild(ref)
    }
  }
}

/**
 *
 * @param {(Element | Text)[]} refs
 * @param {Element | Text} target
 */
function isAfter([ref], target) {
  return ref.previousSibling?.isSameNode(target) ?? false
}

/**
 * @template {Record<string, unknown>} P
 * @param {Element | string} target
 * @param {import("../renderer/types.js").ComponentRef<P>} component
 * @param {import("../component/types.js").Props<P>} props
 */
export function render(target, component, props) {
  const targetEl =
    typeof target === "string" ? document.querySelector(target) : target
  assert(
    targetEl !== null,
    `Target element with selector "${String(target)}" not found.`
  )
  return _render(domRenderer, targetEl, component, props)
}
