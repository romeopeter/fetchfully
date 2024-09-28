import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "./src/index.ts",
      name: "FetchWrapper",
      fileName: (format) => `fetch-wrapper.${format}.js`,
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
});
