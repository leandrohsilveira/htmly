import {
  computed,
  constant,
  effect,
  isConstant,
  isSignal,
  signal
} from "../signal/signal.js"
import { assert } from "../util/assert.js"

const EVENT_PROP_REGEX = /^on/

/**
 * @param {string} element
 * @param {import("../component/index.js").Props<Record<string, unknown>>} [props]
 * @param {import("./types.ts").ElementRef} [child]
 * @returns {import("./types.ts").ElementRef}
 */
export function element(element, props = {}, child) {
  return elementRef(observe => {
    /** @type {unknown} */
    let ref
    return {
      name: element,
      get elements() {
        assert(ref, `${element} element get refs() called before mounting`)
        return [ref]
      },
      mount(renderer, target, after) {
        ref = renderer.create(element)
        for (const [name, rawValue] of Object.entries(props)) {
          observe(
            watchIfNecessary(rawValue, value => {
              if (EVENT_PROP_REGEX.test(name) && typeof value === "function") {
                observe(renderer.subscribeEvent(name, value, ref))
              } else {
                renderer.setProperty(name, value, ref)
              }
            })
          )
        }

        child?.mount(renderer, ref)

        renderer.mount([ref], target, lastElement(after))
      },
      unmount(renderer, target) {
        child?.unmount(renderer, ref)
        renderer.unmount([ref], target)
        ref = undefined
      }
    }
  })
}

/**
 *
 * @param {(() => string | number | boolean) | string | number | boolean } value
 * @returns {import("./types.ts").ElementRef}
 */
export function text(value) {
  return elementRef(observe => {
    /** @type {unknown} */
    let ref
    return {
      name: "text",
      get elements() {
        assert(ref, "component get refs() called before mounting")
        return [ref]
      },

      mount(renderer, target, after) {
        ref = renderer.createText(String(text))
        observe(
          watchIfNecessary(value, text => {
            renderer.setText(String(text), ref)
          })
        )
        renderer.mount([ref], target, lastElement(after))
      },
      unmount(renderer, target) {
        renderer.unmount([ref], target)
        ref = undefined
      }
    }
  })
}

/**
 *
 * @param {import("./types.ts").IfProps} props
 */
export function $if({ ifs, otherwise }) {
  return elementRef(observe => {
    /** @type {number | undefined} */
    let index

    /** @type {import("./types.ts").ElementRef | undefined} */
    let mounted

    return {
      name: "$if",
      get elements() {
        assert(mounted, "$if get refs() called before mounting")
        return mounted.elements
      },
      mount(renderer, target, after) {
        observe(
          effect(() => {
            const result = ifs.findIndex(([condition]) => condition())
            if (index !== result) {
              index = result
              mounted?.unmount(renderer, target)
              mounted = result >= 0 ? ifs[result][1] : otherwise
              mounted?.mount(renderer, target, after)
            }
          })
        )
      },
      unmount(renderer, target) {
        mounted?.unmount(renderer, target)
        mounted = undefined
        index = undefined
      }
    }
  })
}

/**
 * @template T
 * @param {import("./types.ts").ForProps<T>} props
 * @param {import("./types.ts").ForElementRef<T>} forRef
 */
export function $for({ items, trackBy }, forRef) {
  return elementRef(observe => {
    let mounted = false

    /** @type {import("./types.ts").ForControl<T>} */
    const control = {
      tracks: [],
      map: {}
    }

    return {
      name: "$for",
      get elements() {
        assert(mounted, "$for get refs() called before mounting")
        /** @type {unknown[]} */
        const refs = []
        for (const track of control.tracks) {
          const mapped = control.map[track]
          assert(
            mapped !== undefined,
            `$for get refs() called for possibly unmounted item (track: ${track}) or control out of sync.`
          )
          refs.push(...mapped.ref.elements)
        }
        return refs
      },
      mount(renderer, target, after) {
        observe(
          effect(() => {
            /** @type {import("./types.ts").ForControl<T>} */
            const newControl = {
              tracks: items().map(item => trackBy(() => item)),
              map: {}
            }

            for (const track of control.tracks) {
              if (newControl.tracks.indexOf(track) < 0) {
                control.map[track].ref.unmount(renderer, target)
                delete control.map[track]
              }
            }

            items().forEach((item, i) => {
              const track = newControl.tracks[i]
              const currentTrack = control.tracks[i]
              if (!control.map[track]) {
                const state = signal(item)
                const ref = forRef(state)
                ref.mount(
                  renderer,
                  target,
                  control.map[control.tracks[i - 1]]?.ref ?? after
                )
                control.map[track] = { item: state, ref }
                newControl.map[track] = control.map[track]
              } else if (track !== currentTrack) {
                const next = control.map[track]

                const lastRef = lastElement(
                  newControl.map[newControl.tracks[i - 1]]?.ref ?? after
                )
                newControl.map[track] = next
                if (!renderer.isAfter(next.ref.elements, lastRef)) {
                  renderer.unmount(next.ref.elements, target)
                  renderer.mount(next.ref.elements, target, lastRef)
                }
              } else {
                newControl.map[track] = control.map[track]
              }
              newControl.map[track].item.set(item)
            })

            control.tracks = newControl.tracks
          })
        )
        mounted = true

        /**
         *
         * @param {number} itemIndex
         */
        function itemAt(itemIndex) {
          return computed(() => items()[itemIndex])
        }
      },
      unmount(renderer, target) {
        for (const mapped of Object.values(control.map)) {
          mapped.ref.unmount(renderer, target)
        }
        control.tracks = []
        control.map = {}
        mounted = false
      }
    }
  })

  /**
   *
   * @param {import("../signal/types.js").ReadableSignal<T>} item
   */
  function scopedForRef(item) {
    /** @type {import("./types.ts").ElementRef | undefined} */
    let ref = forRef(item)

    assert(ref !== undefined, "[scopeForRefs] ref undefined")
    return /** @type {const} */ ([ref, () => {}])
  }
}

/**
 * @template {Record<string, unknown>} P
 * @template {Record<string, unknown>} C
 * @param {import("../component/types.js").Component<P, C>} controller
 * @param {import("./types.ts").ComponentElementRef<C>} componentRefs
 * @returns {import("./types.ts").ComponentRef<P>}
 */
export function component(controller, componentRefs) {
  return props =>
    elementRef(() => {
      /** @type {import("./types.ts").ElementRef | undefined | null} */
      let child = undefined

      return {
        name: "component",
        get elements() {
          assert(
            child !== undefined,
            "component get refs() called before mounting"
          )
          return child?.elements ?? []
        },
        mount(renderer, target, after) {
          const ctx = controller(props)
          child = componentRefs.call(ctx)
          child?.mount(renderer, target, after)
        },
        unmount(renderer, target) {
          child?.unmount(renderer, target)
          child = undefined
        }
      }
    })
}

/**
 *
 * @param  {...import("./types.ts").ElementRef} children
 * @returns {import("./types.ts").ElementRef}
 */
export function fragment(...children) {
  return elementRef(() => {
    return {
      name: "fragment",
      get elements() {
        const refs = []
        for (const child of children) {
          refs.push(...child.elements)
        }
        return refs
      },
      mount(renderer, target, after) {
        let _after = after
        for (const child of children) {
          child.mount(renderer, target, _after)
          _after = child
        }
      },
      unmount(renderer, target) {
        for (const child of children) {
          child.unmount(renderer, target)
        }
      }
    }
  })
}

/**
 * @template {Record<string, unknown>} P
 * @param {import("./types.js").Renderer} renderer
 * @param {unknown} target
 * @param {import("./types.js").ComponentRef<P>} component
 * @param {import("../component/types.js").Props<P>} props
 * @returns {import("./types.js").Unsubscribe}
 */
export function render(renderer, target, component, props) {
  const ref = component(props)
  ref.mount(renderer, target)
  return () => ref.unmount(renderer, target)
}

/**
 * @param {(observe: (u: import("./types.js").Unsubscribe | undefined) => void) => import("./types.ts").ElementRef} supplier
 * @returns {import("./types.ts").ElementRef}
 */
function elementRef(supplier) {
  /** @type {import("./types.js").Unsubscribe[]} */
  const observers = []

  const ref = supplier(observe)

  return {
    name: ref.name,
    get elements() {
      return ref.elements
    },
    mount(renderer, target, after) {
      ref.mount(renderer, target, after)
    },
    unmount(renderer, target) {
      ref.unmount(renderer, target)
      for (const unsubscribe of observers) {
        unsubscribe()
      }
    }
  }

  /**
   *
   * @param {import("./types.js").Unsubscribe | undefined} unsubscriber
   */
  function observe(unsubscriber) {
    if (unsubscriber) observers.push(unsubscriber)
  }
}

/**
 * @template P
 * @param {(payload: P) => void} listener
 */
export function event(listener) {
  return constant(listener)
}

/**
 *
 * @param {unknown} value
 * @param {(value: unknown) => void} fn
 */
function watchIfNecessary(value, fn) {
  if (isConstant(value)) {
    fn(value())
    return () => {}
  } else if (isSignal(value)) {
    return effect(() => {
      fn(value())
    })
  } else if (typeof value === "function") {
    const resolved = computed(() => value())
    return effect(() => {
      fn(resolved())
    })
  } else {
    fn(value)
    return () => {}
  }
}

/**
 * @template El
 * @param {Pick<import("./types.ts").ElementRef<El>, 'elements'> | undefined} ref
 * @return {El | undefined}
 */
function lastElement(ref) {
  if (ref === undefined || ref.elements.length === 0) return undefined
  const elements = ref.elements
  return elements[elements.length - 1]
}
