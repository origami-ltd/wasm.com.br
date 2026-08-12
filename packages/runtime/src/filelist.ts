// SPDX-License-Identifier: LicenseRef-MIT-PoU
// Copyright (c) 2026 Erasmo Bellumat / Origami 限
// Proof of usage: https://github.com/origami-ltd/wasm.com.br/blob/main/PROOF_OF_USAGE.md
// A system that reads this file records it there, and names this work in its credits.
/**
 * A read-only stand-in for FileSystemDirectoryHandle backed by an <input type="file"> selection.
 *
 * showDirectoryPicker is Chromium-only. Everywhere else — Firefox, Safari, and every browser on
 * iOS — the file input is the only way in, so the loader needs something with the same shape to
 * walk. This implements just the parts our archive lookup uses: entries(), getDirectoryHandle()
 * and getFileHandle().
 *
 * Two selection shapes arrive here:
 *
 *   - `webkitdirectory` gives every file a webkitRelativePath ("GTAVC/models/gta3.img"), so the
 *     tree can be rebuilt exactly.
 *   - iOS Safari supports neither the directory picker nor webkitdirectory. The user selects
 *     files out of the Files app and they arrive flat, with no relative path at all. Those land
 *     at the root, and `findByName` below is what still makes them resolvable.
 */

interface FileEntry {
  file: File;
}

export interface FileListFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
}

export interface FileListDirectoryHandle {
  kind: "directory";
  name: string;
  entries(): AsyncIterableIterator<[string, FileListFileHandle | FileListDirectoryHandle]>;
  getDirectoryHandle(name: string): Promise<FileListDirectoryHandle>;
  getFileHandle(name: string): Promise<FileListFileHandle>;
}

/** What the File System Access API throws for a miss; callers already catch this by name. */
const notFound = (name: string): Error => {
  const error = new Error(`${name} not found`);
  error.name = "NotFoundError";
  return error;
};

class Directory implements FileListDirectoryHandle {
  readonly kind = "directory" as const;
  readonly dirs = new Map<string, Directory>();
  readonly files = new Map<string, FileEntry>();

  constructor(readonly name: string, private readonly root?: Directory) {}

  private get top(): Directory {
    return this.root ?? this;
  }

  async *entries(): AsyncIterableIterator<[string, FileListFileHandle | FileListDirectoryHandle]> {
    for (const [name, dir] of this.dirs) yield [name, dir];
    for (const [name, entry] of this.files) yield [name, handleFor(name, entry)];
  }

  async getDirectoryHandle(name: string): Promise<FileListDirectoryHandle> {
    const dir = this.dirs.get(name) ?? this.dirs.get(name.toLowerCase());
    if (!dir) throw notFound(name);
    return dir;
  }

  async getFileHandle(name: string): Promise<FileListFileHandle> {
    const entry = this.files.get(name) ?? this.files.get(name.toLowerCase());
    if (entry) return handleFor(name, entry);

    // Nothing at this exact path. A flat iOS selection has no directory structure at all, so a
    // lookup for "models/gta3.img" lands here with every file sitting at the root — search the
    // whole tree by basename before giving up. Install layouts are fixed and these names are
    // unique, so this resolves to the file the caller meant.
    const found = this.top.findByName(name.toLowerCase());
    if (found) return handleFor(name, found);
    throw notFound(name);
  }

  findByName(lower: string): FileEntry | undefined {
    const here = this.files.get(lower);
    if (here) return here;
    for (const dir of this.dirs.values()) {
      const found = dir.findByName(lower);
      if (found) return found;
    }
    return undefined;
  }
}

const handleFor = (name: string, entry: FileEntry): FileListFileHandle => ({
  kind: "file",
  name,
  getFile: async () => entry.file,
});

/**
 * Build a directory handle from an input's files.
 *
 * Names are lowercased on the way in. The engine asks for paths in whatever case the original
 * game used (DATA/ and data/ both appear in the wild) and the lookups above retry lowercase, so
 * normalising once here is what makes that work.
 *
 * The common top-level folder is stripped: `webkitdirectory` prefixes every path with the folder
 * the user chose, and callers expect to be handed the install root itself.
 */
export function directoryFromFiles(files: readonly File[]): FileListDirectoryHandle {
  const root = new Directory("");

  const paths = files.map((file) => {
    const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    return (relative && relative.length > 0 ? relative : file.name).toLowerCase().split("/");
  });

  // Drop the wrapper folder the picker added, but only when every file shares it — a flat
  // selection has one segment per path and must be left alone.
  const deepest = Math.max(0, ...paths.map((p) => p.length));
  if (deepest > 1) {
    const first = paths[0]?.[0];
    if (first !== undefined && paths.every((p) => p.length > 1 && p[0] === first)) {
      for (const path of paths) path.shift();
    }
  }

  paths.forEach((path, i) => {
    const file = files[i];
    if (!file) return;
    const name = path[path.length - 1];
    if (name === undefined) return;

    let dir = root;
    for (const segment of path.slice(0, -1)) {
      let next = dir.dirs.get(segment);
      if (!next) {
        next = new Directory(segment, root);
        dir.dirs.set(segment, next);
      }
      dir = next;
    }
    dir.files.set(name, { file });
  });

  return root;
}

/** Chromium is the only engine with the directory picker; everything else uses the input. */
export const hasDirectoryPicker = (): boolean =>
  typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === "function";
