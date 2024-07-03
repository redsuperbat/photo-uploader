import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { Logger } from "swiss-log";
import { TokenRepository } from "./TokenRepo.js";

import { createWriteStream, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { hash } from "node:crypto";
import { MimeLookup } from "./mime.js";

const logger = Logger.withDefaults();
const port = parseInt(process.env.PORT ?? "44445");
const filePath = process.env.RECEVIED_FILE_PATH ?? "./received";
const tokenFilePath = process.env.TOKEN_FILE ?? "./tokens";

logger.info("ensuring received dir");
if (!existsSync(filePath)) {
  logger.info("received dir does not exist, creating it");
  await mkdir(filePath);
}

logger.info("ensuring token file");
if (!existsSync(tokenFilePath)) {
  logger.info("token file does not exist, creating it");
  await writeFile(tokenFilePath, Buffer.from(""));
}

const tokenRepo = new TokenRepository({
  tokenFilePath,
});
const mime = new MimeLookup();
const app = new Hono();

app.use((ctx, next) => {
  logger.info("incoming request", { url: ctx.req.url });
  return next();
});

function extractFiles(files: string | File | (string | File)[]): File[] {
  if (typeof files === "string") return [];
  if (Array.isArray(files)) {
    return files.filter((it) => typeof it === "object");
  }
  return [files];
}

function createFilename(f: File): string {
  const name = hash("md5", f.name.concat(f.type).concat(f.size.toString()));
  const ext = mime.lookup(f.type);
  return `${name}.${ext}`;
}

app.post("/api/files/:token", async (ctx) => {
  const token = ctx.req.param("token");
  logger.info("token", { token });
  const exists = await tokenRepo.exists(token);
  if (!exists) {
    return ctx.json({ message: "invalid token" }, 401);
  }
  const requestBody = await ctx.req.parseBody({ all: true });
  const files = extractFiles(requestBody["file"]);
  logger.info("saving files", { numberOfFiles: files.length });
  await Promise.all(
    files.map((f) => {
      const filename = createFilename(f);
      const stream = createWriteStream(path.join(filePath, filename));
      return new Promise((res) =>
        Readable.from(f.stream()).pipe(stream).once("close", res),
      );
    }),
  );
  return ctx.json({ message: "ok" }, 200);
});

app.use("*", serveStatic({ root: "./dist/client", index: "index.html" }));

serve({ fetch: app.fetch, port });
logger.info(`Started on port ${port}`);
