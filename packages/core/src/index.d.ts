export * from "./util/index.d.ts"
export * from "./signal/index.d.ts"
export * from "./component/index.d.ts"

export declare module "*.component.html" {
  const component: ComponentRef<any>

  export default component
}
