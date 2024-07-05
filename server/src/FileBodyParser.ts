import { WriteStream, createWriteStream } from "fs";

export interface FilePathProvider {
  provide(filename: string): string;
}

export class FileWriter {
  readonly #fileNameIndicator = new Uint8Array([13, 13, 13, 13]);
  readonly #textDecoder = new TextDecoder();
  readonly #filePathProvider: FilePathProvider;

  #buffer = new Uint8Array();
  #fileContentLength?: number;
  #currentFileStream?: WriteStream;

  constructor(opts: { fileNameFormatter: FilePathProvider }) {
    this.#filePathProvider = opts.fileNameFormatter;
  }

  #isEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  #startOfFile(): boolean {
    const b = this.#fileNameIndicator;
    const a = this.#buffer.slice(0, 4);
    return this.#isEqual(a, b);
  }

  #clear() {
    this.#buffer = new Uint8Array();
  }

  #writeAndClose(chunk: Uint8Array) {
    this.#currentFileStream?.write(chunk);
    this.#currentFileStream?.close();
    this.#currentFileStream = undefined;
  }

  next(chunk: Uint8Array): void {
    this.#buffer = chunk;

    // This means we have a file name
    if (this.#startOfFile()) {
      // File name length is located at index 4
      const fileNameLength = this.#buffer[4];
      this.#buffer = this.#buffer.slice(5);

      const fileNameBuffer = this.#buffer.slice(0, fileNameLength);
      this.#buffer = this.#buffer.slice(fileNameLength);

      const filepath = this.#filePathProvider.provide(
        this.#textDecoder.decode(fileNameBuffer),
      );
      this.#currentFileStream = createWriteStream(filepath);

      this.#fileContentLength = this.#buffer[0];
      this.#buffer = this.#buffer.slice(1);
      console.log({
        contentLength: this.#fileContentLength,
        filepath,
      });
    }

    if (this.#fileContentLength! > this.#buffer.length) {
      this.#currentFileStream!.write(this.#buffer);
      this.#fileContentLength! -= this.#buffer.length;
    } else if (this.#fileContentLength! < this.#buffer.length) {
      const rest = this.#buffer.slice(this.#fileContentLength!);
      const last = this.#buffer.slice(0, this.#fileContentLength);
      this.#writeAndClose(last);
      // Start new file
      this.next(rest);
    } else {
      this.#writeAndClose(this.#buffer);
    }
    this.#clear();
  }
}

export class StreamReader {
  #reader: ReadableStreamDefaultReader<Uint8Array>;
  #fileWriter: FileWriter;

  constructor(opts: {
    stream: ReadableStream<Uint8Array>;
    fileWriter: FileWriter;
  }) {
    this.#fileWriter = opts.fileWriter;
    this.#reader = opts.stream.getReader();
  }

  #start(controller: ReadableStreamDefaultController<Uint8Array>) {
    const push = async () => {
      const { done, value } = await this.#reader.read();
      if (done) {
        controller.close();
        this.#reader.releaseLock();
        return;
      }

      this.#fileWriter.next(value);
      push();
    };
    push();
  }

  stream() {
    const self = this;
    return new ReadableStream<Uint8Array>({
      start: this.#start.bind(self),
    });
  }
}
