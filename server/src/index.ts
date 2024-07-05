import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { ensureDir, ensureFile, ensureFileSync } from "fs-extra";
import { Hono } from "hono";
import { Logger } from "swiss-log";
import { TokenRepository, TokenSerializer } from "./TokenRepository.js";

import {
  PhotoUploaderFile,
  FileMetadataSerializer,
  TOKEN_HEADER,
} from "@photo-uploader/shared";
import path from "node:path";
import { Readable } from "node:stream";
import { FileWriter, StreamReader } from "./FileBodyParser.js";

const logger = Logger.withDefaults();
const port = parseInt(process.env.PORT ?? "44445");
const filePath = process.env.RECEVIED_FILE_PATH ?? "./received";
const tokenFilePath = process.env.TOKEN_FILE ?? "./tokens";

logger.info("ensuring received dir");
await ensureDir(filePath);

logger.info("ensuring token file");
await ensureFile(tokenFilePath);

const tokenSerializer = new TokenSerializer();
const fileMetadataSerializer = new FileMetadataSerializer();
const tokenRepo = new TokenRepository({
  tokenFilePath,
  serializer: tokenSerializer,
});
const app = new Hono();

app.use((ctx, next) => {
  logger.info("incoming request", { url: ctx.req.url, method: ctx.req.method });
  return next();
});

app.onError((error, ctx) => {
  logger.error("unhandled error", {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
  return ctx.json({ message: "Internal Server Error" }, 500);
});

app.post("/api/files", async (ctx) => {
  const tokenId = ctx.req.header(TOKEN_HEADER);
  const filesHeader = ctx.req.header(PhotoUploaderFile.HEADER);
  if (!tokenId || !filesHeader) {
    return ctx.json({ message: "invalid request" }, 400);
  }

  logger.info("uploading files", { tokenId, filesHeader });
  const token = await tokenRepo.getById(tokenId);
  if (!token) {
    return ctx.json({ message: "invalid token" }, 401);
  }
  const files = fileMetadataSerializer.serialize(filesHeader);
  const fileWriters = files.map(
    (file) =>
      new FileWriter({
        file,
        filePathProvider: {
          provide(filename) {
            const filepath = path.join(filePath, token.namespace, filename);
            ensureFileSync(filepath);
            return filepath;
          },
        },
      }),
  );

  const streamReader = new StreamReader({
    stream: ctx.req.raw.body!,
    fileWriters,
  });

  await new Promise<void>((res, rej) =>
    Readable.from(streamReader.stream()).once("close", res).once("error", rej),
  );

  await tokenRepo.update(tokenId, {
    lastUsed: new Date(),
    uploads: (token.uploads += files.length),
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
