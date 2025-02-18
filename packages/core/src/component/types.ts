import { ReadableSignal } from "../signal/index.js"

export type Prop<T> = T extends Function ? T : T | (() => T)

export type Props<T extends Record<string, unknown>> = {
  [K in keyof T]: Prop<T[K]>
}

export type PropsRef<T extends Record<string, unknown>> = {
  [K in keyof T]-?: ReadableSignal<T[K]>
}

export type ControllerInput<P extends Record<string, unknown>> = {
  props: PropsRef<P>
}

export type Controller<
  P extends Record<string, unknown>,
  C extends Record<string, unknown>
> = (input: ControllerInput<P>) => C

export type Component<
  P extends Record<string, unknown>,
  C extends Record<string, unknown>
> = (props: Props<P>) => C
