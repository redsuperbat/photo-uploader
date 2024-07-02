import { readFile } from "node:fs/promises";

export class TokenRepository {
  #tokenFilePath: string;
  constructor(opts: { tokenFilePath: string }) {
    this.#tokenFilePath = opts.tokenFilePath;
  }

  async exists(token: string): Promise<boolean> {
    const tokens = await readFile(this.#tokenFilePath, "utf8");
    return tokens
      .split("\n")
      .map((it) => it.trim())
      .some((it) => it === token);
  }
}
