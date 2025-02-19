import { Expression } from "acorn"

export type AstNodes =
  | "Element"
  | "Attribute"
  | "Expression"
  | "Text"
  | "If"
  | "For"

export interface Ast {
  html: AstNode[]
}

export interface AbstractAstNode {
  type: AstNodes
}

export type AstNode =
  | AstNodeElement
  | AstNodeExpression
  | AstNodeText
  | AstNodeIf
  | AstNodeFor

export interface AstNodeElement extends AbstractAstNode {
  type: "Element"
  name: string
  attributes: AstNodeAttribute[]
  children: AstNode[]
}

export type AstNodeAttribute = AstNodeAttributeLiteral | AstNodeAttributeDynamic

export interface AstNodeAttributeAbstract extends AbstractAstNode {
  type: "Attribute"
  name: string
  kind: "Flag" | "Literal" | "Property" | "Event"
  value: AstNodeExpression | AstNodeText
}

export interface AstNodeAttributeLiteral extends AbstractAstNode {
  type: "Attribute"
  name: string
  kind: "Literal"
  value: AstNodeText
}

export interface AstNodeAttributeDynamic extends AbstractAstNode {
  type: "Attribute"
  name: string
  kind: "Property" | "Event" | "Flag"
  value: AstNodeExpression
}

export interface AstNodeExpression extends AbstractAstNode {
  type: "Expression"
  value: Expression
}

export interface AstNodeText extends AbstractAstNode {
  type: "Text"
  value: string
}

export interface AstNodeIf extends AbstractAstNode {
  type: "If"
  test: Expression
  then: AstNode[]
  elifs: AstNodeIf[]
  otherwise: AstNode[]
}

export interface AstNodeFor extends AbstractAstNode {
  type: "For"
  item: Expression
  items: Expression
  track: Expression
  children: AstNode[]
}

export interface AnalyzeResult {
  variables: string[]
  methods: string[]
}

export interface TransformController extends AnalyzeResult {
  path: string
}

export interface BaseOptions {
  cwd?: string
}

export interface ScanOptions extends BaseOptions {
  prefix?: string
}

export interface TransformOptions extends BaseOptions {}

export interface FoundComponentInfo {
  baseName: string
  template?: string
  controller?: string
}

export interface ComponentInfo {
  baseName: string
  template: string
  component: string
  controller: string
}
