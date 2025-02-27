import { Expression } from "acorn"

export type AstNodes =
  | "Element"
  | "Attribute"
  | "Expression"
  | "Text"
  | "If"
  | "ElseIf"
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
  | AstNodeElseIf
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
  elifs?: AstNodeElseIf[]
  otherwise?: AstNode[]
}

export interface AstNodeElseIf extends AbstractAstNode {
  type: "ElseIf"
  test: Expression
  then: AstNode[]
}

export interface AstNodeFor extends AbstractAstNode {
  type: "For"
  item: Expression
  items: Expression
  track: Expression
  children: AstNode[]
  empty?: AstNode[]
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
  genCssScope?: (componentName: string) => string
}

export interface TransformOptions {
  template: AstNode[]
  info: ComponentInfo
  infos: Record<string, ComponentInfo>
  resolver(info: ComponentInfo): string
}

export interface FoundComponentInfo {
  baseName: string
  template?: string
  controller?: string
  styles?: string
}

export interface ComponentInfo {
  name: string
  baseName: string
  context: string
  template: string
  component: string
  controller: string
  styles?: string
  scope?: string
}
