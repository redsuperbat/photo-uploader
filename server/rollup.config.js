import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";

/**
 * @type {import("rollup").OutputOptions}
 */
const output = {
  file: "dist/index.js",
  format: "esm",
};

/**
 * @type {import("rollup").RollupOptions}
 */
const config = [
  {
    input: "src/index.ts",
    output,
    external: [/hono/, "fs-extra", "swiss-log", /node:/],
    plugins: [
      typescript(),
      nodeResolve({
        resolveOnly: ["@photo-uploader/shared"],
      }),
    ],
  },
];
export default config;
