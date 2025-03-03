import { defineConfig } from "@htmly/core/config"

export default defineConfig({
  namespaces: {
    app: {
      scanDir: "./src/app"
    },
    ui: {
      scanDir: "./src/ui"
    }
  }
})
