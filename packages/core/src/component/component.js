/**
@import {
  Component,
  ComponentInputDefinition,
  Controller,
} from "./types.js"
 */
import { constant, isSignal, toReadableSignal } from "../signal/signal.js"

/**
 * @template {ComponentInputDefinition} I
 * @template {Record<string, unknown>} C
 * @param {Controller<I, C>} controllerFn
 * @returns {Component<I, C>}
 */
export function controller(controllerFn) {
  /**
   * @param {*} input
   */
  return ({ props, events, slots = {} }) => {
    const context = controllerFn({
      get props() {
        return proxifyProps(props)
      },
      get events() {
        return proxifyEvents(events)
      },
      get slots() {
        return handleSlots(slots)
      }
    })

    return context
  }
}

/**
 *
 * @param {*} input
 * @return {*}
 */
function proxifyProps(input) {
  return new Proxy(input, {
    get(target, prop) {
      if (prop in target) {
        const value = target[String(prop)]
        if (isSignal(value)) return toReadableSignal(value)
        if (typeof value === "function") return value
        return constant(value)
      }
      return constant(undefined)
    }
  })
}

/**
 *
 * @param {*} input
 * @return {*}
 */
function proxifyEvents(input) {
  return new Proxy(input, {
    get(target, prop) {
      if (prop in target) {
        const value = target[String(prop)]
        if (typeof value === "function") return value
      }
      return () => {}
    }
  })
}

/**
 *
 * @param {*} slots
 * @returns {*}
 */
function handleSlots(slots) {
  if (!slots) return {}
  return Object.fromEntries(
    Object.entries(slots).map(([key, value]) => [
      key,
      value !== undefined && value !== null
    ])
  )
}
