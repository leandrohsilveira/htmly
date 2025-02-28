import { describe, expect, it } from "vitest"
import { parseAst } from "./parser.js"
import { astHelper, t } from "./testing/ast.js"

describe("parseAst function", () => {
  it("should parse elements", () => {
    const result = parseAst("<div></div>")

    expect(result).toEqual([
      {
        type: t.Element,
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
        type: t.Element,
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
        type: t.Text,
        value: "Hello world"
      }
    ])
  })

  it("should parse expressions", () => {
    const result = parseAst("{{ this.foo() }}")

    expect(result).toMatchObject([
      {
        type: t.Expression,
        value: {
          type: t.CallExpression,
          callee: {
            type: t.MemberExpression,
            object: {
              type: t.ThisExpression
            },
            property: {
              type: t.Identifier,
              name: "foo"
            }
          },
          arguments: []
        }
      }
    ])
  })

  it("should parse element attributes", () => {
    const result = parseAst('<div foo="bar"></div>')

    expect(result).toEqual([
      {
        type: t.Element,
        name: "div",
        attributes: [
          {
            type: t.Attribute,
            name: "foo",
            kind: t.Literal,
            value: {
              type: t.Text,
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

    expect(result).toMatchObject([
      {
        type: t.Element,
        name: "div",
        attributes: [
          {
            type: t.Attribute,
            name: "foo",
            kind: "Property",
            value: {
              type: t.Expression,
              value: {
                type: t.CallExpression,
                callee: {
                  type: t.MemberExpression,
                  object: {
                    type: t.ThisExpression
                  },
                  property: {
                    type: t.Identifier,
                    name: "bar"
                  }
                }
              }
            }
          }
        ],
        children: []
      }
    ])
  })

  it("should parse element events", () => {
    const result = parseAst('<div (foo)="(this.bar)"></div>')

    expect(result).toMatchObject([
      {
        type: t.Element,
        name: "div",
        attributes: [
          {
            type: t.Attribute,
            name: "foo",
            kind: "Event",
            value: {
              type: t.Expression,
              value: {
                type: t.MemberExpression,
                object: {
                  type: t.ThisExpression
                },
                property: {
                  type: t.Identifier,
                  name: "bar"
                }
              }
            }
          }
        ],
        children: []
      }
    ])
  })

  it("should parse element flags", () => {
    const result = parseAst("<div foo></div>")

    expect(result).toMatchObject([
      {
        type: t.Element,
        name: "div",
        attributes: [
          {
            type: t.Attribute,
            name: "foo",
            kind: "Flag",
            value: {
              type: t.Expression,
              value: {
                type: t.Literal,
                value: true
              }
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
        type: t.Element,
        name: "div",
        attributes: [],
        children: [
          {
            type: t.Element,
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
        type: t.Element,
        name: "div",
        attributes: [],
        children: [
          {
            type: t.Text,
            value: "foo"
          }
        ]
      }
    ])
  })

  it("should parse elements with expressions", () => {
    const result = parseAst("<div>{{ this.foo() }}</div>")

    expect(result).toMatchObject([
      {
        type: t.Element,
        name: "div",
        attributes: [],
        children: [
          {
            type: t.Expression,
            value: {
              type: t.CallExpression,
              callee: {
                type: t.MemberExpression,
                object: {
                  type: t.ThisExpression
                },
                property: {
                  type: t.Identifier,
                  name: "foo"
                }
              },
              arguments: []
            }
          }
        ]
      }
    ])
  })

  it("should parse expressions with regexp test with ternary operator", () => {
    const result = parseAst("<div>{{ /^Le/.test(this.name()) }}</div>")

    const helper = astHelper(result)

    expect(
      helper
        .find(t.Expression, { parent: t.Element })
        .find(t.CallExpression)
        .find(t.MemberExpression)
        .find(t.Literal)
    ).toMatchObject({
      value: {
        regex: {
          pattern: "^Le"
        }
      }
    })
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

    const $if = astHelper(result).find(t.If)

    expect($if.find(t.CallExpression, { key: "test" })).toMatchObject({
      value: {
        callee: {
          object: {
            type: t.ThisExpression
          },
          property: {
            name: "foo"
          }
        },
        arguments: []
      }
    })

    expect($if.find(t.Element, { key: "then", index: 0 })).toMatchObject({
      value: {
        attributes: [],
        name: "div",
        children: [
          {
            type: t.Text,
            value: "foo"
          }
        ]
      }
    })

    const $elseif = $if.find(t.ElseIf, { key: "elifs", index: 0 })

    expect($elseif.find(t.CallExpression, { key: "test" })).toMatchObject({
      value: {
        callee: {
          object: {
            type: t.ThisExpression
          },
          property: {
            name: "bar"
          }
        },
        arguments: []
      }
    })

    expect($elseif.find(t.Element, { key: "then", index: 0 })).toMatchObject({
      value: {
        attributes: [],
        name: "div",
        children: [
          {
            type: t.Text,
            value: "bar"
          }
        ]
      }
    })

    expect($if.find(t.Element, { key: "otherwise", index: 0 })).toMatchObject({
      value: {
        attributes: [],
        name: "div",
        children: [
          {
            type: t.Text,
            value: "baz"
          }
        ]
      }
    })
  })

  it("should parse @empty statement for @for statements", () => {
    const result = parseAst(`
        @for (item of this.items(); track item().id) {
          <div>foo</div>
        } @empty {
          <div>bar</div>
        }
    `)

    const $for = astHelper(result).find(t.For, { parent: null })

    expect(
      $for.find(t.Identifier, { parent: t.For, key: "item" })
    ).toMatchObject({
      value: {
        type: t.Identifier,
        name: "item"
      }
    })

    expect(
      $for.find(t.CallExpression, { parent: t.For, key: "items" })
    ).toMatchObject({
      value: {
        type: t.CallExpression,
        callee: {
          type: t.MemberExpression,
          object: {
            type: t.ThisExpression
          },
          property: {
            type: t.Identifier,
            name: "items"
          }
        },
        arguments: []
      }
    })

    expect(
      $for.find(t.MemberExpression, { parent: t.For, key: "track" })
    ).toMatchObject({
      value: {
        type: t.MemberExpression,
        object: {
          type: t.CallExpression,
          callee: {
            type: t.Identifier,
            name: "item"
          },
          arguments: []
        },
        property: {
          type: t.Identifier,
          name: "id"
        }
      }
    })

    expect(
      $for.find(t.Element, { parent: t.For, key: "children", index: 0 })
    ).toMatchObject({
      value: {
        type: t.Element,
        name: "div",
        attributes: [],
        children: [
          {
            type: t.Text,
            value: "foo"
          }
        ]
      }
    })

    expect(
      $for.find(t.Element, { parent: t.For, key: "empty", index: 0 })
    ).toMatchObject({
      value: {
        type: t.Element,
        name: "div",
        attributes: [],
        children: [
          {
            type: t.Text,
            value: "bar"
          }
        ]
      }
    })
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

    expect(result).toMatchObject([
      {
        type: t.If,
        test: {
          type: t.CallExpression,
          callee: {
            type: t.MemberExpression,
            object: {
              type: t.ThisExpression
            },
            property: {
              type: t.Identifier,
              name: "foo"
            }
          },
          arguments: []
        },
        then: [
          {
            type: t.Element,
            name: "div",
            attributes: [],
            children: [
              {
                type: t.Text,
                value: "foo"
              }
            ]
          },
          {
            type: t.If,
            test: {
              type: t.CallExpression,
              callee: {
                type: t.MemberExpression,
                object: {
                  type: t.ThisExpression
                },
                property: {
                  type: t.Identifier,
                  name: "bar"
                }
              },
              arguments: []
            },
            then: [
              {
                type: t.Element,
                name: "div",
                attributes: [],
                children: [
                  {
                    type: t.Text,
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

    expect(result).toMatchObject([
      {
        type: t.For,
        item: { type: t.Identifier, name: "item" },
        items: {
          type: t.CallExpression,
          callee: {
            type: t.MemberExpression,
            object: {
              type: t.ThisExpression
            },
            property: {
              type: t.Identifier,
              name: "items"
            }
          },
          arguments: []
        },
        track: {
          type: t.MemberExpression,
          object: {
            type: t.CallExpression,
            callee: {
              type: t.Identifier,
              name: "item"
            },
            arguments: []
          },
          property: {
            type: t.Identifier,
            name: "id"
          }
        },
        children: [
          {
            type: t.Element,
            name: "div",
            attributes: [],
            children: [
              {
                type: t.Text,
                value: "foo"
              }
            ]
          }
        ]
      }
    ])
  })
})
