import { copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const distFile = (name: string) => fileURLToPath(new URL(`./dist/${name}`, import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: "./src/index.ts",
      name: "fetchfully",
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
  plugins: [
    dts({
      rollupTypes: true,
      // The package is ESM ("type": "module"), so TypeScript reads index.d.ts
      // as ESM. CommonJS consumers (module node16/nodenext) need the same
      // declarations as a .d.cts file, which `exports.require.types` points to.
      afterBuild: () => copyFileSync(distFile("index.d.ts"), distFile("index.d.cts")),
    }),
  ],
});
