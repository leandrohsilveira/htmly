import { ElementRef } from "../renderer/types.js"
import { Constant, ReadableSignal } from "../signal/index.js"

export type ComponentInputDefinition = {
  props?: unknown
  events?: unknown
  slots?: unknown
}

export type InputDefinition = ComponentInputDefinition & {
  attrs?: unknown
}

export type InputProps<T> = {
  [K in keyof T]: () => T[K]
}

export type InputAttrs<T> = {
  [K in keyof T]?: T[K]
}

export type InputEvents<T> = {
  [K in keyof T]: (event: T[K]) => void
}

export type InputSlots<T, El = unknown, Ref = El> = {
  [K in keyof T]: (context: T[K]) => ElementRef<El, Ref>
}

export type Prop<T> = T extends Function ? T : T | (() => T)

export type ComponentInput<
  T extends ComponentInputDefinition,
  El = unknown,
  Ref = El
> = (T["props"] extends Record<string, unknown>
  ? { props: InputProps<T["props"]> } & { attrs?: InputAttrs<T["props"]> }
  : {}) &
  (T["events"] extends Record<string, unknown>
    ? { events: InputEvents<T["events"]> }
    : {}) &
  (T["slots"] extends Record<string, unknown>
    ? { slots: InputSlots<T["slots"], El, Ref> }
    : {})

export type PropsRef<T extends ComponentInputDefinition> = {
  [K in keyof T["props"]]-?:
    | ReadableSignal<T["props"][K]>
    | Constant<T["props"][K]>
}

export type EventsRef<T extends ComponentInputDefinition> = {
  [K in keyof T["events"]]-?: T["events"][K] extends void
    ? () => void
    : (e: T["events"][K]) => void
}

export type SlotsRef<T extends ComponentInputDefinition> = {
  [K in keyof T["slots"]]-?: boolean
}

export type ControllerInput<P extends ComponentInputDefinition> = {
  props: PropsRef<P>
  events: EventsRef<P>
  slots: SlotsRef<P>
}

export type Controller<
  P extends ComponentInputDefinition,
  C extends Record<string, unknown>
> = (input: ControllerInput<P>) => C

export type Component<
  I extends ComponentInputDefinition,
  C extends Record<string, unknown>
> = (props: ComponentInput<I>) => C
