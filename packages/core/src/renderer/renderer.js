import { computed, effect, effectScope, signal } from "alien-signals"
import { constant, isConstant } from "../signal/signal.js"
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
          watchIfNecessary(rawValue, value => {
            if (EVENT_PROP_REGEX.test(name) && typeof value === "function") {
              observe(renderer.subscribeEvent(name, value, ref))
            } else {
              renderer.setProperty(name, value, ref)
            }
          })
        }

        child?.mount(renderer, ref)

        renderer.mount([ref], target, lastElement(after))
      },
      unmount(renderer, target) {
        child?.unmount(renderer, child)
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
  return elementRef(() => {
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
        watchIfNecessary(value, text => {
          renderer.setText(String(text), ref)
        })
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
  return elementRef(() => {
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
        effect(() => {
          const result = ifs.findIndex(([condition]) => condition())
          if (index !== result) {
            index = result
            mounted?.unmount(renderer, target)
            mounted = result >= 0 ? ifs[result][1] : otherwise
            mounted?.mount(renderer, target, after)
          }
        })
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
 * @param {import("./types.ts").ForElementRefs<T>} forRefs
 */
export function $for({ items, trackBy }, forRefs) {
  return elementRef(() => {
    /**
     * @type {string[] | undefined}
     */
    let tracks

    /**
     * @type {Record<string, import("../signal/types.js").Signal<T>> | undefined}
     */
    let map

    /** @type {Record<string, import("./types.ts").ElementRef> | undefined} */
    let mounted

    function getRefs() {
      assert(mounted && tracks, "$for get refs() called before mounting")
      /** @type {unknown[]} */
      const refs = []
      for (const track of tracks) {
        const ref = mounted[track]
        assert(
          ref !== undefined,
          `$for get refs() called for unmounted item. (track: ${track})`
        )
        refs.push(...ref.elements)
      }
      return refs
    }

    return {
      name: "$for",
      get elements() {
        return getRefs()
      },
      mount(renderer, target, after) {
        effect(() => {
          if (tracks && map && mounted) {
            /**
             * @type {string[] | undefined}
             */
            const newTracks = []

            for (let i = 0; i < items().length; i++) {
              const item = () => items()[i]
              const track = trackBy(item)
              newTracks[i] = track
              if (!map[track]) {
                map[track] = signal(item())
              } else {
                map[track](item())
              }
            }

            /** @type {string[]} */
            let detached = []
            for (let i = 0; i < tracks.length || i < newTracks.length; i++) {
              const track = tracks[i]
              const newTrack = newTracks[i]
              const currentlyMounted = mounted[track]
              let nextMounted = mounted[newTrack]
              if (newTrack !== track) {
                if (!currentlyMounted) {
                  nextMounted = nextMounted ?? forRefs(map[newTrack])
                  nextMounted.mount(
                    renderer,
                    target,
                    mounted[tracks[i - 1]] ?? after
                  )
                  mounted[newTrack] = nextMounted
                  detached = detached.filter(t => t !== newTrack)
                } else if (newTrack && !nextMounted) {
                  nextMounted = forRefs(map[newTrack])
                  nextMounted.mount(
                    renderer,
                    target,
                    mounted[tracks[i - 1]] ?? after
                  )
                  renderer.unmount(currentlyMounted.elements, target)
                  mounted[newTrack] = nextMounted
                  detached.push(track)
                } else if (currentlyMounted && !newTrack) {
                  renderer.unmount(currentlyMounted.elements, target)
                  detached.push(track)
                } else {
                  if (detached.indexOf(newTrack) >= 0) {
                    renderer.mount(
                      nextMounted.elements,
                      target,
                      lastElement(mounted[tracks[i - 1]] ?? after)
                    )
                    detached = detached.filter(t => t !== newTrack)
                  } else {
                    renderer.replace(
                      target,
                      nextMounted.elements,
                      currentlyMounted.elements
                    )
                    detached = detached.filter(t => t !== newTrack)
                    detached.push(track)
                  }
                }
              }
            }

            for (const track of detached) {
              try {
                mounted[track]?.unmount(renderer, target)
              } catch (err) {
                console.debug(err)
              }
              delete mounted[track]
              delete map[track]
            }

            tracks = newTracks
          } else {
            tracks = []
            map = {}
            mounted = {}

            for (let i = 0; i < items().length; i++) {
              const item = () => items()[i]
              const track = trackBy(item)
              tracks[i] = track
              map[track] = signal(item())
              mounted[track] = forRefs(map[track])
              mounted[track].mount(
                renderer,
                target,
                mounted[tracks[i - 1]] ?? after
              )
            }
          }
        })
      },
      unmount(renderer, target) {
        for (const track of tracks ?? []) {
          mounted?.[track]?.unmount(renderer, target)
        }
        tracks = undefined
        map = undefined
        mounted = undefined
      }
    }
  })
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
  /** @type {(() => void) | undefined} */
  let stopScope = undefined

  /** @type {import("./types.js").Unsubscribe[]} */
  const observers = []

  const ref = supplier(observe)

  return {
    name: ref.name,
    get elements() {
      return ref.elements
    },
    mount(renderer, target, after) {
      stopScope = effectScope(() => {
        ref.mount(renderer, target, after)
      })
    },
    unmount(renderer, target) {
      ref.unmount(renderer, target)
      for (const unsubscribe of observers) {
        unsubscribe()
      }
      stopScope?.()
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
  }
  if (typeof value === "function") {
    effect(() => {
      const resolved = computed(() => value())
      fn(resolved())
    })
  } else {
    fn(value)
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
