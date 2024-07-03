import { readFile } from "node:fs/promises";

export class TokenRepository {
  #tokenFilePath: string;
  constructor(opts: { tokenFilePath: string }) {
    this.#tokenFilePath = opts.tokenFilePath;
  }

  async get(token: string): Promise<{ namespace: string }> {
    const tokens = await readFile(this.#tokenFilePath, "utf8");
    const entry = tokens
      .split("\n")
      .map((it) => {
        const [token, namespace] = it.trim().split(":");
        return { token, namespace };
      })
      .find((it) => it.token === token);
    return entry;
  }
}
