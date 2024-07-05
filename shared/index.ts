export const TOKEN_HEADER = "x-rsb-token";

export type PhotoUploaderFile = {
  size: number;
  name: string;
  streamStartIndex: number;
};

export namespace PhotoUploaderFile {
  export const HEADER = "x-rbs-files";
}

export class FileMetadataSerializer {
  serialize(header: string): PhotoUploaderFile[] {
    return header.split(";").map((it) => {
      const [name, size, streamStart] = it
        .split(":")
        .map((it) => decodeURIComponent(it));

      return {
        name,
        size: parseInt(size),
        streamStartIndex: parseInt(streamStart),
      };
    });
  }

  deserialize(files: Omit<PhotoUploaderFile, "streamStartIndex">[]): string {
    let position = 0;
    return files
      .map((it) => {
        const s = [it.name, it.size, position]
          .map((it) => encodeURIComponent(it.toString()))
          .join(":");
        position += it.size;
        return s;
      })
      .join(";");
  }
}
