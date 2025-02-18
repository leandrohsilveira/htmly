export type ReadableSignal<T> = () => T

export type Signal<T> = ReadableSignal<T> & ((value: T) => void)

export type Constant<T> = ReadableSignal<T> & { constant: true }
