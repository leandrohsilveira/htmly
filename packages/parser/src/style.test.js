import { describe, expect, it } from "vitest"
import { scopeCss } from "./style.js"

describe("scopeCss function", () => {
  const scope = "_test_"

  it("should scope class selector", () => {
    const input = ".test { color: red; }"
    const result = scopeCss(input, scope)
    expect(result).toEqual(`.test[${scope}]{color:red}`)
  })

  it("should scope id selector", () => {
    const input = "#test { color: red; }"
    const result = scopeCss(input, scope)
    expect(result).toEqual(`#test[${scope}]{color:red}`)
  })

  it("should scope element selector", () => {
    const input = "li { color: red; }"
    const result = scopeCss(input, scope)
    expect(result).toEqual(`li[${scope}]{color:red}`)
  })

  it("should scope attribute selector", () => {
    const input = '[type="text"] { color: red; }'
    const result = scopeCss(input, scope)
    expect(result).toEqual(`[type="text"][${scope}]{color:red}`)
  })

  it("should scope class selector with pseudo selector", () => {
    const input = ".test:is() { color: red; }"
    const result = scopeCss(input, scope)
    expect(result).toEqual(`.test[${scope}]:is(){color:red}`)
  })

  it("should scope attribute with pseudo selector including its inner selectors", () => {
    const input = '[type="name"]:is(.name) { color: red; }'
    const result = scopeCss(input, scope)
    expect(result).toEqual(
      `[type="name"][${scope}]:is(.name[${scope}]){color:red}`
    )
  })

  it("should scope a pseudo selector's inner selectors", () => {
    const input = ":is(.name,.value) { color: red; }"
    const result = scopeCss(input, scope)
    expect(result).toEqual(`:is(.name[${scope}],.value[${scope}]){color:red}`)
  })

  it("should scope class selector with pseudo element selector", () => {
    const input = ".item::last-child { color: red; }"
    const result = scopeCss(input, scope)
    expect(result).toEqual(`.item[${scope}]::last-child{color:red}`)
  })
})
