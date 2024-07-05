import * as esbuild from "esbuild";
import { nodeExternalsPlugin } from "esbuild-node-externals";

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/index.js",
  format: "esm",
  target: "esnext",
  platform: "node",
  external: ["@hono"],
  plugins: [
    nodeExternalsPlugin({
      allowList: ["@photo-uploader/shared"],
    }),
  ],
});
