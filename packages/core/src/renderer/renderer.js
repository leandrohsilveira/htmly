/**
@import {
 ElementRef,
 Unsubscribe,
 Renderer,
 ComponentRef,
 ComponentElementRef,
 ElementInput,
 ForControl,
 ForProps,
 IfProps,
 ForElementRef
} from "./types.js"
@import {
 Component,
 Input,
 ComponentInputDefinition,
 Controller,
 ComponentInput
} from "../component/types.js"
*/
import { proxifyInput, proxifySlots } from "../component/component.js"
import {
  computed,
  constant,
  effect,
  isConstant,
  isSignal,
  signal
} from "../signal/signal.js"
import { isArrayEmpty } from "../util/array.js"
import { assert } from "../util/assert.js"

/**
 * @param {string} element
 */
export function $e(element) {
  return el

  /**
   * @param {ElementInput<*>} [input]
   * @returns {ElementRef}
   */
  function el({ props, attrs, events, child } = {}) {
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
          for (const [name, value] of Object.entries(attrs ?? {})) {
            renderer.setProperty(name, value, ref)
          }
          /** @type {[() => boolean, () => string[]][]} */
          let classMappers = []
          for (const [name, value] of Object.entries(props ?? {})) {
            if (name === "class") {
              classMappers.push([() => true, () => value()])
              continue
            }
            if (/^class\./.test(name)) {
              const className = name.replace(/^class\./, "")
              classMappers.push([() => value(), () => [className]])
              continue
            }
            if (isConstant(value)) {
              renderer.setProperty(name, value(), ref)
            } else {
              observe(
                effect(() => {
                  renderer.setProperty(name, value(), ref)
                })
              )
            }
          }
          observe(
            effect(() => {
              if (classMappers.length > 0) {
                /** @type {string[]} */
                const classes = []
                for (const [test, getter] of classMappers) {
                  if (test()) {
                    classes.push(...getter())
                  }
                }
                renderer.setProperty("class", classes, ref)
              }
            })
          )
          for (const [name, listener] of Object.entries(events ?? {})) {
            observe(renderer.subscribeEvent(name, listener, ref))
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
}

/**
 *
 * @param {(() => string | number | boolean) | string | number | boolean } value
 * @returns {ElementRef}
 */
export function $t(value) {
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
        ref = renderer.createText(String($t))
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
 * @param {IfProps} props
 */
export function $if({ ifs, otherwise }) {
  return elementRef(observe => {
    /** @type {number | undefined} */
    let index

    /** @type {ElementRef | undefined} */
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
 * @param {ForProps<T>} props
 * @param {ForElementRef<T>} forRef
 */
export function $for({ items, trackBy, empty }, forRef) {
  return elementRef(observe => {
    let mounted = false

    /** @type {ElementRef | undefined} */
    let emptyMounted

    /** @type {ForControl<T>} */
    const control = {
      tracks: [],
      map: {}
    }

    return {
      name: "$for",
      get elements() {
        assert(mounted, "$for get refs() called before mounting")
        if (emptyMounted) return emptyMounted.elements
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
            if (!emptyMounted && isArrayEmpty(items()) && empty) {
              for (const track of control.tracks) {
                control.map[track].ref.unmount(renderer, target)
              }
              control.tracks = []
              control.map = {}
              empty.mount(renderer, target, after)
              emptyMounted = empty
              return
            } else if (emptyMounted && isArrayEmpty(items())) {
              return
            } else if (emptyMounted) {
              emptyMounted.unmount(renderer, target)
              emptyMounted = undefined
            }

            /** @type {ForControl<T>} */
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
}

/**
 * @template {ComponentInputDefinition} I
 * @template {Record<string, unknown>} C
 * @param {Controller<I, C>} controller
 * @param {ComponentElementRef<C, I>} componentRefs
 * @returns {ComponentRef<I>}
 */
export function $c(controller, componentRefs) {
  return props =>
    elementRef(() => {
      /** @type {ElementRef | undefined | null} */
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
          const ctx = controller(proxifyInput(props))
          child = componentRefs.call(ctx, proxifySlots(props))
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
 * @param  {...ElementRef} children
 * @returns {ElementRef}
 */
export function $f(...children) {
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
 * @param {Renderer} renderer
 * @param {unknown} target
 * @param {ComponentRef<P>} component
 * @param {ComponentInput<P>} props
 * @returns {Unsubscribe}
 */
export function render(renderer, target, component, props) {
  const ref = component(props)
  ref.mount(renderer, target)
  return () => ref.unmount(renderer, target)
}

/**
 * @param {(observe: (u: Unsubscribe | undefined) => void) => ElementRef} supplier
 * @returns {ElementRef}
 */
function elementRef(supplier) {
  /** @type {Unsubscribe[]} */
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
   * @param {Unsubscribe | undefined} unsubscriber
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
 * @param {Pick<ElementRef<El>, 'elements'> | undefined} ref
 * @return {El | undefined}
 */
function lastElement(ref) {
  if (ref === undefined || ref.elements.length === 0) return undefined
  const elements = ref.elements
  return elements[elements.length - 1]
}
