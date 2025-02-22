import type {
  ComponentInput,
  ComponentInputDefinition,
  InputAttrs,
  InputDefinition,
  InputEvents,
  InputProps,
  InputSlots
} from "../component/types.js"
import { ReadableSignal, Signal } from "../signal/types.js"

export type Unsubscribe = () => void

export type ElementInput<T extends InputDefinition, El = unknown, Ref = El> = {
  attrs?: InputAttrs<T["attrs"]>
  props?: InputProps<T["props"]>
  events?: InputEvents<T["events"]>
  child?: ElementRef<El, Ref>
}

export interface Renderer<El = unknown, Text = El, EventListener = Function> {
  create(name: string): El
  mount(
    ref: (El | Text)[],
    target: El,
    after?: El | Text
  ): El | Text | undefined
  unmount(ref: (El | Text)[], target: El): void
  isAfter(refs: (El | Text)[], target: El | Text): boolean
  subscribeEvent(name: string, value: EventListener, ref: El): Unsubscribe
  setProperty(name: string, value: unknown, ref: El): void
  createText(initial: string): Text
  setText(text: string, ref: Text): void
  replace(container: El, replacers: El[], targets: El[]): void
}

export interface ElementRef<El = unknown, Ref = El> {
  name: string
  readonly elements: Ref[]
  mount(
    renderer: Renderer<El, Ref>,
    target: El,
    after?: ElementRef<El, Ref>
  ): void
  unmount(renderer: Renderer<El, Ref>, target: El): void
}

export type ComponentRef<
  P extends ComponentInputDefinition,
  El = unknown,
  Ref = El
> = (props: ComponentInput<P, El, Ref>) => ElementRef<El, Ref>

export type ComponentElementRef<
  Ctx extends Record<string, unknown>,
  I extends ComponentInputDefinition,
  El = unknown,
  Ref = El
> = (
  this: Ctx,
  slots: InputSlots<I["slots"], El, Ref>
) => ElementRef<El, Ref> | null

export type IfProps<El = unknown, Ref = El> = {
  ifs: [() => boolean, ElementRef<El, Ref>][]
  otherwise?: ElementRef<El, Ref>
}

export type ForProps<T, El = unknown, Ref = El> = {
  items(): T[]
  trackBy(item: () => T): string
  empty?: ElementRef<El, Ref>
}

export type ForElementRef<T, El = unknown, Ref = El> = (
  item: ReadableSignal<T>
) => ElementRef<El, Ref>

export type ForControl<T> = {
  tracks: string[]
  map: Record<
    string,
    {
      ref: ElementRef
      item: Signal<T>
    }
  >
}
