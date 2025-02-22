/**
@import {Expression, PrivateIdentifier} from "acorn"
*/
import { describe, expect, it } from "vitest"
import { parseAst } from "./parser.js"
import {
  genCallExpression,
  genIdentifier,
  genLiteral,
  genMemberExpression
} from "./ast.js"

describe("parseAst function", () => {
  it("should parse elements", () => {
    const result = parseAst("<div></div>")

    expect(result).toEqual([
      {
        type: "Element",
        name: "div",
        attributes: [],
        children: []
      }
    ])
  })

  it("should parse self-closing elements", () => {
    const result = parseAst("<div />")

    expect(result).toEqual([
      {
        type: "Element",
        name: "div",
        attributes: [],
        children: []
      }
    ])
  })

  it("should parse text nodes", () => {
    const result = parseAst("Hello world")

    expect(result).toEqual([
      {
        type: "Text",
        value: "Hello world"
      }
    ])
  })

  it("should parse expressions", () => {
    const result = parseAst("{{ this.foo() }}")

    expect(result).toEqual([
      {
        type: "Expression",
        value: genThisCallExpression(genIdentifier("foo"))
      }
    ])
  })

  it("should parse element attributes", () => {
    const result = parseAst('<div foo="bar"></div>')

    expect(result).toEqual([
      {
        type: "Element",
        name: "div",
        attributes: [
          {
            type: "Attribute",
            name: "foo",
            kind: "Literal",
            value: {
              type: "Text",
              value: "bar"
            }
          }
        ],
        children: []
      }
    ])
  })

  it("should parse element properties", () => {
    const result = parseAst('<div [foo]="this.bar()"></div>')

    expect(result).toEqual([
      {
        type: "Element",
        name: "div",
        attributes: [
          {
            type: "Attribute",
            name: "foo",
            kind: "Property",
            value: {
              type: "Expression",
              value: genThisCallExpression(genIdentifier("bar"))
            }
          }
        ],
        children: []
      }
    ])
  })

  it("should parse element events", () => {
    const result = parseAst('<div (foo)="(this.bar)"></div>')

    expect(result).toEqual([
      {
        type: "Element",
        name: "div",
        attributes: [
          {
            type: "Attribute",
            name: "foo",
            kind: "Event",
            value: {
              type: "Expression",
              value: gen(
                genMemberExpression(
                  gen({ type: "ThisExpression" }),
                  gen(genIdentifier("bar"))
                )
              )
            }
          }
        ],
        children: []
      }
    ])
  })

  it("should parse element flags", () => {
    const result = parseAst("<div foo></div>")

    expect(result).toEqual([
      {
        type: "Element",
        name: "div",
        attributes: [
          {
            type: "Attribute",
            name: "foo",
            kind: "Flag",
            value: {
              type: "Expression",
              value: gen(genLiteral(true))
            }
          }
        ],
        children: []
      }
    ])
  })

  it("should parse nested elements", () => {
    const result = parseAst("<div><div></div></div>")

    expect(result).toEqual([
      {
        type: "Element",
        name: "div",
        attributes: [],
        children: [
          {
            type: "Element",
            name: "div",
            attributes: [],
            children: []
          }
        ]
      }
    ])
  })

  it("should parse elements with text nodes", () => {
    const result = parseAst("<div>foo</div>")

    expect(result).toEqual([
      {
        type: "Element",
        name: "div",
        attributes: [],
        children: [
          {
            type: "Text",
            value: "foo"
          }
        ]
      }
    ])
  })

  it("should parse elements with expressions", () => {
    const result = parseAst("<div>{{ this.foo() }}</div>")

    expect(result).toEqual([
      {
        type: "Element",
        name: "div",
        attributes: [],
        children: [
          {
            type: "Expression",
            value: genThisCallExpression(genIdentifier("foo"))
          }
        ]
      }
    ])
  })

  it("it should parse @if statements", () => {
    const result = parseAst(`
        @if (this.foo()) {
            <div>foo</div>
        } @else if (this.bar()) {
            <div>bar</div>
        } @else {
            <div>baz</div>
        }
    `)

    expect(result).toEqual([
      {
        type: "If",
        test: genThisCallExpression(genIdentifier("foo")),
        then: [
          {
            type: "Element",
            name: "div",
            attributes: [],
            children: [
              {
                type: "Text",
                value: "foo"
              }
            ]
          }
        ],
        elifs: [
          {
            type: "ElseIf",
            test: genThisCallExpression(genIdentifier("bar")),
            then: [
              {
                type: "Element",
                name: "div",
                attributes: [],
                children: [
                  {
                    type: "Text",
                    value: "bar"
                  }
                ]
              }
            ]
          }
        ],
        otherwise: [
          {
            type: "Element",
            name: "div",
            attributes: [],
            children: [
              {
                type: "Text",
                value: "baz"
              }
            ]
          }
        ]
      }
    ])
  })

  it("should parse @empty statement for @for statements", () => {
    const result = parseAst(`
        @for (item of this.items(); track item().id) {
          <div>foo</div>
        } @empty {
          <div>bar</div>
        }
    `)

    expect(result).toEqual([
      {
        type: "For",
        item: gen(genIdentifier("item")),
        items: genThisCallExpression(genIdentifier("items")),
        track: gen(
          genMemberExpression(
            gen(genCallExpression(gen(genIdentifier("item")))),
            gen(genIdentifier("id"))
          )
        ),
        children: [
          {
            type: "Element",
            name: "div",
            attributes: [],
            children: [
              {
                type: "Text",
                value: "foo"
              }
            ]
          }
        ],
        empty: [
          {
            type: "Element",
            name: "div",
            attributes: [],
            children: [
              {
                type: "Text",
                value: "bar"
              }
            ]
          }
        ]
      }
    ])
  })

  it("should parse nested @if statements", () => {
    const result = parseAst(`
        @if (this.foo()) {
            <div>foo</div>
            @if (this.bar()) {
                <div>bar</div>
            }
        }
    `)

    expect(result).toEqual([
      {
        type: "If",
        test: genThisCallExpression(genIdentifier("foo")),
        then: [
          {
            type: "Element",
            name: "div",
            attributes: [],
            children: [
              {
                type: "Text",
                value: "foo"
              }
            ]
          },
          {
            type: "If",
            test: genThisCallExpression(genIdentifier("bar")),
            then: [
              {
                type: "Element",
                name: "div",
                attributes: [],
                children: [
                  {
                    type: "Text",
                    value: "bar"
                  }
                ]
              }
            ]
          }
        ]
      }
    ])
  })

  it("should parse @for statements", () => {
    const result = parseAst(`
        @for (item of this.items(); track item().id) {
            <div>foo</div>
        }
    `)

    expect(result).toEqual([
      {
        type: "For",
        item: gen(genIdentifier("item")),
        items: genThisCallExpression(genIdentifier("items")),
        track: gen(
          genMemberExpression(
            gen(genCallExpression(gen(genIdentifier("item")))),
            gen(genIdentifier("id"))
          )
        ),
        children: [
          {
            type: "Element",
            name: "div",
            attributes: [],
            children: [
              {
                type: "Text",
                value: "foo"
              }
            ]
          }
        ]
      }
    ])
  })
})

/**
 *
 * @param {*} exp
 */
function gen({ start, end, ...obj }) {
  return expect.objectContaining(obj)
}

/**
 *
 * @param {Expression | PrivateIdentifier} property
 * @returns
 */
function genThisCallExpression(property) {
  return gen(
    genCallExpression(
      gen(genMemberExpression(gen({ type: "ThisExpression" }), gen(property)))
    )
  )
}
