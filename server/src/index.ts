import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { Logger } from "swiss-log";
import { TokenRepository, TokenSerializer } from "./TokenRepo.js";
import { ensureDir, ensureFile } from "fs-extra";

import path from "node:path";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { hash } from "node:crypto";
import { MimeLookup } from "./mime.js";

const logger = Logger.withDefaults();
const port = parseInt(process.env.PORT ?? "44445");
const filePath = process.env.RECEVIED_FILE_PATH ?? "./received";
const tokenFilePath = process.env.TOKEN_FILE ?? "./tokens";

logger.info("ensuring received dir");
await ensureDir(filePath);

logger.info("ensuring token file");
await ensureFile(tokenFilePath);

const serializer = new TokenSerializer();
const tokenRepo = new TokenRepository({
  tokenFilePath,
  serializer,
});
const mime = new MimeLookup();
const app = new Hono();

app.use((ctx, next) => {
  logger.info("incoming request", { url: ctx.req.url, method: ctx.req.method });
  return next();
});

function createFilename(f: File): string {
  const name = hash("md5", f.name.concat(f.type).concat(f.size.toString()));
  const ext = mime.lookup(f.type);
  return `${name}.${ext}`;
}

app.post("/api/files", async (ctx) => {
  const tokenId = ctx.req.header("x-rsb-token");
  if (!tokenId) {
    return ctx.json({ message: "invalid token" }, 401);
  }
  logger.info("token", { token: tokenId });
  const token = await tokenRepo.getById(tokenId);

  if (!token) {
    return ctx.json({ message: "invalid token" }, 401);
  }
  const formData = await ctx.req.formData();
  const files = formData.getAll("files").filter((it) => typeof it === "object");

  logger.info("saving files", { numberOfFiles: files.length });
  await Promise.all(
    files.map(async (f) => {
      const filename = createFilename(f);
      const filepath = path.join(filePath, token.namespace, filename);
      await ensureFile(filepath);
      const stream = createWriteStream(filepath);
      await new Promise((res, rej) =>
        Readable.from(f.stream())
          .pipe(stream)
          .once("close", res)
          .once("error", rej),
      );
    }),
  );

  await tokenRepo.update(tokenId, {
    lastUsed: new Date(),
    uploads: token.uploads + files.length,
  });

  return ctx.json({ message: "ok" }, 200);
});

app.get("/api/files", async (ctx) => {
  const tokenId = ctx.req.header("x-rsb-token");
  if (!tokenId) {
    return ctx.json({ message: "invalid token" }, 401);
  }
  logger.info("token", { tokenId });
  const token = await tokenRepo.getById(tokenId);

  if (!token) {
    return ctx.json({ message: "invalid token" }, 401);
  }

  logger.info("getting token", { tokenId });
  return ctx.json(token);
});

app.use("*", serveStatic({ root: "./dist/client", index: "index.html" }));

serve({ fetch: app.fetch, port });
logger.info(`Started on port ${port}`);
