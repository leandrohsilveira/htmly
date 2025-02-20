import path from "node:path"

/**
 *
 * @param {string} from
 * @param {string} to
 * @returns {string}
 */
export function relative(from, to) {
  const rel = path.relative(from, to)
  return /^[^.]/.test(rel) ? `./${rel}` : rel
}
