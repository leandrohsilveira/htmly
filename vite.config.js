import { defineConfig } from "vite"
import { configDefaults } from "vitest/config"

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: "istanbul",
      reporter: ["text", "json", "html"],
      exclude: [
        ...(configDefaults.coverage.exclude ?? []),
        "**/testing.js",
        "**/testing.ts",
        "**/testing/**",
        "**/dist/**"
      ]
    }
  }
})
