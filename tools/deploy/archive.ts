import { deflateRawSync, inflateRawSync } from 'node:zlib';

/**
 * A zip, written and read here rather than by a command line tool.
 *
 * The runtime is handed a zip and it loads the handler from the root of what it unpacks, so the
 * names in the archive are the whole of what matters: a bundle under a directory name is a bundle
 * the platform cannot find. Writing the format here keeps that rule in one place, lets the load
 * check unpack without a second tool on the runner, and keeps the archive the same bytes every
 * time.
 */

/** One file in the archive. The name is the path from the root of the zip. */
export interface ArchiveEntry {
  readonly name: string;
  readonly contents: Uint8Array;
}

/**
 * The instant every entry carries, which is the first second a zip can hold: the format keeps two
 * seconds of resolution from 1980. It is fixed because the code hash is read from the bytes of the
 * archive, so an archive that carried the time it was made would give unchanged code a new hash on
 * every build, and every merge would upload a function that did not change.
 */
const fixedDosTime = 0;
const fixedDosDate = (1980 - 1980) * 512 + 1 * 32 + 1;

/** A file anybody may read and its owner may write, which is what the runtime needs of it. */
const readableFileMode = 0o100644;

const crcTable = ((): Int32Array => {
  const table = new Int32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value;
  }

  return table;
})();

export function crc32Of(bytes: Uint8Array): number {
  let value = -1;

  for (const byte of bytes) {
    value = (value >>> 8) ^ (crcTable[(value ^ byte) & 0xff] ?? 0);
  }

  return (value ^ -1) >>> 0;
}

interface Written {
  readonly localHeader: Buffer;
  readonly compressed: Buffer;
  readonly name: Buffer;
  readonly crc: number;
  readonly size: number;
  readonly offset: number;
}

/** The archive as bytes, with the entries in the order they were given. */
export function zipOf(entries: readonly ArchiveEntry[]): Buffer {
  const written: Written[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const contents = Buffer.from(entry.contents);
    const compressed = deflateRawSync(contents, { level: 9 });
    const crc = crc32Of(contents);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(fixedDosTime, 10);
    localHeader.writeUInt16LE(fixedDosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(contents.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    written.push({ localHeader, compressed, name, crc, size: contents.length, offset });
    offset += localHeader.length + name.length + compressed.length;
  }

  const directory = written.map((entry) => {
    const header = Buffer.alloc(46);

    header.writeUInt32LE(0x02014b50, 0);
    // The high byte says the archive was made on a unix system, which is what makes the file mode
    // below mean anything to whatever unpacks it.
    header.writeUInt16LE(0x031e, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0, 8);
    header.writeUInt16LE(8, 10);
    header.writeUInt16LE(fixedDosTime, 12);
    header.writeUInt16LE(fixedDosDate, 14);
    header.writeUInt32LE(entry.crc, 16);
    header.writeUInt32LE(entry.compressed.length, 20);
    header.writeUInt32LE(entry.size, 24);
    header.writeUInt16LE(entry.name.length, 28);
    header.writeUInt16LE(0, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE(readableFileMode * 0x10000, 38);
    header.writeUInt32LE(entry.offset, 42);

    return Buffer.concat([header, entry.name]);
  });

  const body = Buffer.concat(
    written.flatMap((entry) => [entry.localHeader, entry.name, entry.compressed]),
  );
  const centralDirectory = Buffer.concat(directory);
  const end = Buffer.alloc(22);

  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(written.length, 8);
  end.writeUInt16LE(written.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(body.length, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([body, centralDirectory, end]);
}

/** Everything the archive holds, read back out of its own central directory. */
export function entriesIn(archive: Buffer): ArchiveEntry[] {
  const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));

  if (end < 0) {
    throw new Error('this is not a zip: it carries no end of central directory record');
  }

  const count = archive.readUInt16LE(end + 10);
  const entries: ArchiveEntry[] = [];
  let at = archive.readUInt32LE(end + 16);

  for (let read = 0; read < count; read += 1) {
    if (archive.readUInt32LE(at) !== 0x02014b50) {
      throw new Error(`the central directory of this zip stops after ${read} of ${count} entries`);
    }

    const compressedSize = archive.readUInt32LE(at + 20);
    const nameLength = archive.readUInt16LE(at + 28);
    const extraLength = archive.readUInt16LE(at + 30);
    const commentLength = archive.readUInt16LE(at + 32);
    const localHeader = archive.readUInt32LE(at + 42);
    const name = archive.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    const localNameLength = archive.readUInt16LE(localHeader + 26);
    const localExtraLength = archive.readUInt16LE(localHeader + 28);
    const from = localHeader + 30 + localNameLength + localExtraLength;

    entries.push({
      name,
      contents: new Uint8Array(inflateRawSync(archive.subarray(from, from + compressedSize))),
    });

    at += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}
