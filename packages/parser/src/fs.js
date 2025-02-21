import path from "node:path"
import fs from "node:fs"

/**
 *
 * @param {string} dir
 * @param {boolean} [recursive=false]
 * @returns {AsyncGenerator<string>}
 */
export async function* walk(dir, recursive = true) {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name)
    if (d.isDirectory() && recursive) yield* await walk(entry)
    else if (d.isFile()) yield entry
  }
}
