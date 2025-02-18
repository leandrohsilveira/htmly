import type { Prop, Props } from "../component/types.js"
import { ReadableSignal } from "../signal/types.js"

export type Unsubscribe = () => void

export interface Renderer<El = unknown, Text = El, EventListener = Function> {
  create(name: string): El
  mount(
    ref: (El | Text)[],
    target: El,
    after?: El | Text
  ): El | Text | undefined
  unmount(ref: (El | Text)[], target: El): void
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
  P extends Record<string, unknown>,
  El = unknown,
  Ref = El
> = (props: Props<P>) => ElementRef<El, Ref>

export type ComponentElementRef<
  Ctx extends Record<string, unknown>,
  El = unknown,
  Ref = El
> = (this: Ctx) => ElementRef<El, Ref> | null

export type IfProps<El = unknown, Ref = El> = {
  ifs: [() => boolean, ElementRef<El, Ref>][]
  otherwise?: ElementRef<El, Ref>
}

export type ForProps<T> = {
  items(): T[]
  trackBy(item: () => T): string
}

export type ForElementRefs<T, El = unknown, Ref = El> = (
  item: ReadableSignal<T>
) => ElementRef<El, Ref>
