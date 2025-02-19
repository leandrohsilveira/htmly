export type ReadableSignal<T> = (() => T) & {
  signal: boolean
}

export type Signal<T> = ReadableSignal<T> & {
  set(value: T): void
}

export type Constant<T> = (() => T) & { constant: boolean }
