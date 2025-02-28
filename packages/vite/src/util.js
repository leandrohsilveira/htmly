import * as crypto from "node:crypto"

export function generateRandomString(size = 3) {
  return crypto.randomBytes(size).toString("hex")
}
