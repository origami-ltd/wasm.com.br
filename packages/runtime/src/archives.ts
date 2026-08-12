/**
 * Reading a game out of whatever the player actually has: a folder, a zip, a disc image.
 *
 * Nobody keeps a tidy install folder. They have the download they never unpacked, or a disc they
 * ripped years ago, and being told "point me at your install folder" when the install is inside
 * `game.zip` two directories away is a dead end.
 *
 * Everything here is native: DecompressionStream inflates zip entries, and ISO 9660 and MODE1/2352
 * are plain structure walks. No dependency, nothing to ship.
 */

export interface ArchiveFile {
  /** Path inside the archive, lowercased and slash-separated. */
  path: string;
  size: number;
  read(): Promise<Uint8Array>;
}

export type ArchiveKind = "zip" | "iso" | "bincue" | "rar" | "unknown";

/** Classify by extension — the picker gives names long before it gives bytes. */
export function archiveKind(name: string): ArchiveKind {
  const lower = name.toLowerCase();
  if (lower.endsWith(".zip")) return "zip";
  if (lower.endsWith(".iso") || lower.endsWith(".img")) return "iso";
  if (lower.endsWith(".bin") || lower.endsWith(".cue")) return "bincue";
  if (lower.endsWith(".rar")) return "rar";
  return "unknown";
}

export const ARCHIVE_EXTENSIONS = [".zip", ".iso", ".img", ".bin", ".cue", ".rar"];

/* --------------------------------------------------------------------------------- zip */

const readU16 = (view: DataView, at: number): number => view.getUint16(at, true);
const readU32 = (view: DataView, at: number): number => view.getUint32(at, true);

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  // deflate-raw is what zip stores; the browser has had it since 2023 and it beats shipping a
  // decompressor. A Blob stream keeps the whole thing off the main thread.
  const stream = new Blob([data as BlobPart]).stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Read a zip's central directory.
 *
 * The central directory lives at the end, so only its tail is fetched — a 1.5 GB zip is listed
 * without reading 1.5 GB. Entries are inflated one at a time, on demand.
 */
export async function readZip(file: Blob): Promise<ArchiveFile[]> {
  const tailSize = Math.min(file.size, 65_557); // max comment (65535) + EOCD (22)
  const tail = new Uint8Array(await file.slice(file.size - tailSize).arrayBuffer());
  const tailView = new DataView(tail.buffer);

  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i -= 1) {
    if (readU32(tailView, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not a zip file");

  let count = readU16(tailView, eocd + 10);
  let directoryOffset = readU32(tailView, eocd + 16);

  // Zip64: a >4 GB archive stores 0xffffffff here and the real values in its own record.
  if (directoryOffset === 0xffffffff || count === 0xffff) {
    for (let i = eocd - 20; i >= 0; i -= 1) {
      if (readU32(tailView, i) === 0x07064b50) {
        const zip64At = Number(tailView.getBigUint64(i + 8, true));
        const z64 = new DataView(await file.slice(zip64At, zip64At + 56).arrayBuffer());
        count = Number(z64.getBigUint64(32, true));
        directoryOffset = Number(z64.getBigUint64(48, true));
        break;
      }
    }
  }

  const directory = new Uint8Array(await file.slice(directoryOffset).arrayBuffer());
  const view = new DataView(directory.buffer);
  const decoder = new TextDecoder();
  const files: ArchiveFile[] = [];

  let at = 0;
  for (let i = 0; i < count && at + 46 <= directory.length; i += 1) {
    if (readU32(view, at) !== 0x02014b50) break;
    const method = readU16(view, at + 10);
    const compressedSize = readU32(view, at + 20);
    const uncompressedSize = readU32(view, at + 24);
    const nameLength = readU16(view, at + 28);
    const extraLength = readU16(view, at + 30);
    const commentLength = readU16(view, at + 32);
    const localHeaderAt = readU32(view, at + 42);
    const name = decoder.decode(directory.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;

    if (name.endsWith("/")) continue; // directory entry

    files.push({
      path: name.replace(/\\/g, "/").toLowerCase(),
      size: uncompressedSize,
      async read() {
        // The local header repeats the name and extra fields, and its extra length can differ
        // from the central one — so it has to be read rather than assumed.
        const local = new DataView(await file.slice(localHeaderAt, localHeaderAt + 30).arrayBuffer());
        const dataAt = localHeaderAt + 30 + readU16(local, 26) + readU16(local, 28);
        const raw = new Uint8Array(await file.slice(dataAt, dataAt + compressedSize).arrayBuffer());
        return method === 0 ? raw : inflateRaw(raw);
      },
    });
  }
  return files;
}

/* --------------------------------------------------------------------------- disc images */

const SECTOR = 2048;
/** MODE1/2352: 16 bytes of sync+header, 2048 of data, 288 of error correction. */
const RAW_SECTOR = 2352;
const RAW_DATA_AT = 16;

/**
 * A .bin track is the same ISO 9660 filesystem with per-sector headers and ECC around it. Presented
 * as a Blob of just the data areas, every ISO reader below works unchanged.
 */
function isoFromRawSectors(file: Blob): Blob {
  const sectors = Math.floor(file.size / RAW_SECTOR);
  const parts: Blob[] = [];
  for (let i = 0; i < sectors; i += 1) {
    const at = i * RAW_SECTOR + RAW_DATA_AT;
    parts.push(file.slice(at, at + SECTOR));
  }
  return new Blob(parts);
}

/** MODE1/2352 starts with a 12-byte sync pattern; a plain .iso does not. */
async function isRawSectors(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const sync = [0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00];
  return sync.every((byte, i) => head[i] === byte);
}

/**
 * Walk an ISO 9660 directory tree.
 *
 * Only the primary volume descriptor and plain directory records are used — enough for a game
 * disc, and it degrades to the 8.3 names rather than failing when there is no Joliet extension.
 */
export async function readIso(input: Blob): Promise<ArchiveFile[]> {
  const file = (await isRawSectors(input)) ? isoFromRawSectors(input) : input;

  // The primary volume descriptor is always at sector 16 and must say "CD001".
  const pvd = new Uint8Array(await file.slice(16 * SECTOR, 17 * SECTOR).arrayBuffer());
  if (String.fromCharCode(...pvd.subarray(1, 6)) !== "CD001") throw new Error("not an ISO 9660 image");

  const decoder = new TextDecoder();
  const files: ArchiveFile[] = [];

  const walk = async (extent: number, length: number, prefix: string, depth: number): Promise<void> => {
    if (depth > 12) return; // a malformed image must not spin forever
    const dir = new Uint8Array(await file.slice(extent * SECTOR, extent * SECTOR + length).arrayBuffer());
    const view = new DataView(dir.buffer);

    let at = 0;
    while (at < dir.length) {
      const recordLength = dir[at];
      if (!recordLength) {
        // Records never straddle a sector; a zero means "skip to the next one".
        at = (Math.floor(at / SECTOR) + 1) * SECTOR;
        if (at >= dir.length) break;
        continue;
      }
      const childExtent = view.getUint32(at + 2, true);
      const childLength = view.getUint32(at + 10, true);
      const flags = dir[at + 25] ?? 0;
      const nameLength = dir[at + 32] ?? 0;
      const rawName = decoder.decode(dir.subarray(at + 33, at + 33 + nameLength));
      at += recordLength;

      // 0x00 and 0x01 are "." and ".."
      if (nameLength === 1 && (rawName.charCodeAt(0) === 0 || rawName.charCodeAt(0) === 1)) continue;

      const name = rawName.split(";")[0]!.toLowerCase(); // strip the ;1 version suffix
      const path = prefix ? `${prefix}/${name}` : name;

      if (flags & 0x02) {
        await walk(childExtent, childLength, path, depth + 1);
      } else {
        files.push({
          path,
          size: childLength,
          read: async () => new Uint8Array(
            await file.slice(childExtent * SECTOR, childExtent * SECTOR + childLength).arrayBuffer(),
          ),
        });
      }
    }
  };

  const rootRecord = pvd.subarray(156, 190);
  const rootView = new DataView(rootRecord.buffer, rootRecord.byteOffset, rootRecord.byteLength);
  await walk(rootView.getUint32(2, true), rootView.getUint32(10, true), "", 0);
  return files;
}

/* ------------------------------------------------------------------------------ dispatch */

/** Read any supported archive. Throws with something a player can act on. */
export async function readArchive(file: File): Promise<ArchiveFile[]> {
  switch (archiveKind(file.name)) {
    case "zip":
      return readZip(file);
    case "iso":
    case "bincue":
      return readIso(file);
    case "rar":
      // RAR's decompressor is proprietary and there is no browser primitive for it, unlike
      // deflate. Saying so beats a generic failure that reads like a broken page.
      throw new Error(
        "RAR archives cannot be opened in the browser — extract it first, then pick the folder "
        + "or the extracted .iso.",
      );
    default:
      throw new Error(`${file.name} is not a game archive (expected .zip, .iso or .bin/.cue).`);
  }
}

/**
 * Extract into the folder the archive came from, which then *is* the game folder.
 *
 * Deliberately not a temporary directory: the player picked that folder, the files are theirs, and
 * a copy that survives means the next visit skips the whole unpack. Needs a readwrite handle —
 * the picker has to have asked for one.
 */
export async function extractInto(
  directory: FileSystemDirectoryHandle,
  files: ArchiveFile[],
  onProgress: (done: number, total: number, path: string) => void = () => {},
): Promise<void> {
  for (let i = 0; i < files.length; i += 1) {
    const entry = files[i];
    if (!entry) continue;
    const segments = entry.path.split("/").filter(Boolean);
    const name = segments.pop();
    if (!name) continue;

    let target = directory;
    for (const segment of segments) {
      target = await target.getDirectoryHandle(segment, { create: true });
    }

    const handle = await target.getFileHandle(name, { create: true });
    const writable = await (handle as FileSystemFileHandle & {
      createWritable(): Promise<WritableStream<BufferSource> & { close(): Promise<void> }>;
    }).createWritable();
    const writer = writable.getWriter();
    await writer.write(await entry.read());
    await writer.close();

    onProgress(i + 1, files.length, entry.path);
  }
}
