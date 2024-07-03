import { readFile, writeFile } from "node:fs/promises";

type Token = {
  id: string;
  namespace: string;
  uploads: number;
  lastUsed: Date;
};

export class TokenSerializer {
  deserialize(value: string): Token {
    const [id, namespace, uploads, lastUsed] = value.trim().split(":");
    return {
      id,
      namespace,
      uploads: parseInt(uploads ?? "0"),
      lastUsed: lastUsed ? new Date(parseInt(lastUsed)) : new Date(),
    };
  }

  serialize(token: Token): string {
    const { id, lastUsed, uploads, namespace } = token;
    return [
      id,
      namespace,
      uploads.toString(),
      lastUsed.getTime().toString(),
    ].join(":");
  }
}

export class TokenRepository {
  #tokenFilePath: string;
  #serializer: TokenSerializer;

  constructor(opts: { tokenFilePath: string; serializer: TokenSerializer }) {
    this.#tokenFilePath = opts.tokenFilePath;
    this.#serializer = opts.serializer;
  }

  async update(id: string, partial: { uploads?: number; lastUsed?: Date }) {
    const token = await this.getById(id);
    if (!token) return;

    if (partial.uploads) {
      token.uploads = partial.uploads;
    }

    if (partial.lastUsed) {
      token.lastUsed = partial.lastUsed;
    }
    const allTokens = await this.getAll();
    console.log(allTokens);
    const replacedTokens = allTokens
      .map((it) => {
        if (it.id === id) {
          return token;
        }
        return it;
      })
      .map((it) => this.#serializer.serialize(it))
      .join("\n");
    await writeFile(this.#tokenFilePath, replacedTokens);
    return token;
  }

  async getAll(): Promise<Token[]> {
    const tokens = await readFile(this.#tokenFilePath, "utf8");
    return tokens
      .split("\n")
      .filter((it) => it.length > 0)
      .map((it) => this.#serializer.deserialize(it));
  }

  async getById(id: string): Promise<Token | undefined> {
    const allTokens = await this.getAll();
    return allTokens.find((it) => it.id === id);
  }
}
