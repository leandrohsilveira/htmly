/**
 * @template T
 * @param {T[] | null | undefined} arr
 * @returns
 */
export function isArrayEmpty(arr) {
  return arr === null || arr === undefined || arr.length === 0
}
