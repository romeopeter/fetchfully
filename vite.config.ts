import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "./src/index.ts",
      name: "SimpleFetch",
      fileName: (format) => `simple-fetch.${format}.js`,
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
