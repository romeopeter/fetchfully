import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: "./src/index.ts",
      name: "simple-fetcher",
      formats: ["es", "umd"],
      fileName: (format) => `fetchfully.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      // Ensure that dependencies are not bundled
      external: ["tslib"],
      output: {
        globals: {
          tslib: "tslib",
        },
      },
    },
  },
  plugins: [dts({ rollupTypes: true })],
});
