import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createWriteStream, existsSync } from "fs";
import { mkdir } from "fs/promises";
import { Hono } from "hono";
import { MongoClient } from "mongodb";
import path from "path";
import { Readable } from "stream";
import { Logger } from "swiss-log";

const logger = Logger.withDefaults();
const port = parseInt(process.env.PORT ?? "44445");
const filePath = process.env.FILE_PATH ?? "./received";

logger.info("ensuring received dir");
if (!existsSync(filePath)) {
  logger.info("dir does not exist, creating it");
  await mkdir(filePath);
}

const mongo = new MongoClient(process.env.MONGODB_URL!);
logger.info("connecting to mongodb");
await mongo.connect();
const tokensCollection = mongo.db().collection("tokens");
const app = new Hono();

app.use((ctx, next) => {
  logger.info("incoming request", { url: ctx.req.url });
  return next();
});

app.post("/api/files/:token", async (ctx) => {
  const token = ctx.req.param("token");
  logger.info("token", { token });
  const exists = await tokensCollection.findOne({ token });
  if (!exists) {
    return ctx.json({ message: "invalid token" }, 401);
  }
  const requestBody = await ctx.req.parseBody({ all: true });
  const files: File[] = Object.values(requestBody["file"]).filter(
    (it) => typeof it === "object",
  );
  logger.info("saving files", { numberOfFiles: files.length });
  await Promise.all(
    files.map((f) => {
      const stream = createWriteStream(path.join(filePath, f.name));
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
