import { PhotoUploaderFile } from "@photo-uploader/shared";
import { WriteStream, createWriteStream } from "fs";

export interface FilePathProvider {
  provide(filename: string): string;
}

export class FileWriter {
  readonly #file: PhotoUploaderFile;
  readonly #currentFileStream: WriteStream;

  #count = 0;

  constructor(opts: {
    filePathProvider: FilePathProvider;
    file: PhotoUploaderFile;
  }) {
    this.#file = opts.file;
    this.#currentFileStream = createWriteStream(
      opts.filePathProvider.provide(opts.file.name),
    );
  }

  next(chunk: Uint8Array): void {
    const chunkStartIndex = this.#count;
    const chunkEndIndex = this.#count + chunk.length;
    const fileStartIndex = this.#file.streamStartIndex;
    const fileEndIndex = this.#file.size + this.#file.streamStartIndex;

    this.#count = chunkEndIndex;

    // this file is not ready yet
    if (chunkEndIndex < fileStartIndex) {
      return;
    }

    // this file has been written already
    if (chunkStartIndex > fileEndIndex) {
      return;
    }

    // Handle first file in stream
    if (fileStartIndex === 0 && chunkEndIndex < fileEndIndex) {
      this.#currentFileStream.write(chunk);
      return;
    }

    // In the middle of a late chunk
    if (fileEndIndex < chunkEndIndex && fileEndIndex > chunkStartIndex) {
      const endOffset = fileEndIndex - chunkStartIndex;
      this.#currentFileStream.write(chunk.slice(0, endOffset));
      return;
    }

    // In the start of a early chunk
    if (fileStartIndex > chunkStartIndex && fileStartIndex < chunkEndIndex) {
      const startOffset = fileStartIndex - chunkStartIndex;
      this.#currentFileStream.write(chunk.slice(startOffset));
      return;
    }

    // If the chunk is in the middle just write it
    if (chunkStartIndex > fileStartIndex && chunkEndIndex < fileEndIndex) {
      this.#currentFileStream.write(chunk);
      return;
    }
  }

  close() {
    this.#currentFileStream.close();
  }
}

export class StreamReader {
  #reader: ReadableStreamDefaultReader<Uint8Array>;
  #fileWriters: FileWriter[];

  constructor(opts: {
    stream: ReadableStream<Uint8Array>;
    fileWriters: FileWriter[];
  }) {
    this.#fileWriters = opts.fileWriters;
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

      this.#fileWriters.forEach((it) => it.next(value));
      push();
    };
    push();
  }

  stream() {
    const self = this;
    return new ReadableStream<Uint8Array>({
      start: this.#start.bind(self),
      cancel: () => this.#fileWriters.forEach((it) => it.close()),
    });
  }
}
