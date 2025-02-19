import { describe, expect, it } from "vitest"
import { isSignal, signal } from "./signal.js"

describe("isSignal function", () => {
  it("should return true when provided value is a signal", () => {
    const result = isSignal(signal(1))

    expect(result).toBe(true)
  })

  it("should return false when provided value is a string", () => {
    const result = isSignal("value")

    expect(result).toBe(false)
  })

  it("should return false when provided value is a function", () => {
    let result = isSignal(() => {})

    expect(result).toBe(false)

    result = isSignal(function signal() {})

    expect(result).toBe(false)
  })
})
