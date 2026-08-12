// SPDX-License-Identifier: LicenseRef-MIT-PoU
// Copyright (c) 2026 Erasmo Bellumat / Origami 限
// Proof of usage: https://github.com/origami-ltd/wasm.com.br/blob/main/PROOF_OF_USAGE.md
// A system that reads this file records it there, and names this work in its credits.
/**
 * Game archives are streamed on demand instead of being packaged into the wasm bundle.
 *
 * The engine reads archives with plain synchronous file reads, and neither browser escape hatch works
 * here: synchronous XHR is banned on the main thread, and Asyncify cannot unwind through the invoke_*
 * JS frames the engine's try/catch scopes create. So reads really are synchronous — a worker fetches
 * chunks into a SharedArrayBuffer while the main thread spin-waits — with an LRU keeping the
 * engine's many small reads off the network.
 *
 * Nothing here knows which game it is serving. Discovery (what counts as an archive, where it mounts)
 * belongs to the game's own shell; this only moves bytes.
 */
import type { EmscriptenFS, EmscriptenModule } from "./types";

// 4 MiB chunks meant a 1 KiB read cost 4 MiB and only 48 blocks fitted the cache, so a map load
// thrashed and pulled ~35 GB over ~9000 requests. Smaller blocks, far more of them cached.
const CHUNK_SIZE = 256 * 1024;
// 400 MB, deliberately well under the renderer's comfort zone: the engine's own wasm heap rides
// in the same process, and a JS-side gigabyte tips the tab into a GC spiral (black canvas).
const CACHE_LIMIT = 400 * 1024 * 1024;
const READAHEAD = 8;  // chunks pulled per sequential miss
const READAHEAD_RUN = 32; // once a run is established, pull much more per round trip

export { CHUNK_SIZE, CACHE_LIMIT, READAHEAD, READAHEAD_RUN };

export interface ArchiveEntry {
  mount: string;
  name: string;
  url: string;
  size: number;
  /**
   * Set when the player picked their own install; reads then bypass the server.
   *
   * A File rather than a handle, because this is posted to the reader worker and a File is
   * clonable in every engine while a handle is not.
   */
  file?: File;
}

export interface AssetManifest {
  entries: ArchiveEntry[];
  missing: boolean;
  defaultPath: string;
  configPath: string;
}

const workerSource = `
  postMessage("ready");
  onmessage = async (event) => {
    const { url, file, start, end, sab } = event.data;
    const state = new Int32Array(sab, 0, 2);
    const data = new Uint8Array(sab, 8);
    try {
      let bytes;
      if (file) {
        bytes = new Uint8Array(await file.slice(start, end + 1).arrayBuffer());
      } else {
        const response = await fetch(url, { headers: { Range: "bytes=" + start + "-" + end } });
        if (!response.ok && response.status !== 206) throw new Error("HTTP " + response.status);
        bytes = new Uint8Array(await response.arrayBuffer());
      }
      data.set(bytes.subarray(0, data.length));
      state[1] = Math.min(bytes.length, data.length);
      Atomics.store(state, 0, 1);
    } catch {
      state[1] = 0;
      Atomics.store(state, 0, 2);
    }
  };`;

export class ArchiveStreamer {
  private readonly cache = new Map<string, Uint8Array>();
  private readonly byName = new Map<string, ArchiveEntry>();
  private cached = 0;
  private readonly pending = new Set<string>();
  private run = 0;
  private readonly nextIndex = new Map<string, number>();
  private worker: Worker | null = null;
  private buffer: SharedArrayBuffer | null = null;
  /** Resolves once the worker is alive. It must be running before the engine ever spin-waits:
      the main thread never yields afterwards, so a worker started later could never boot. */
  readonly ready: Promise<unknown>;

  /** Plain field rather than a constructor parameter property: the latter is not erasable
      syntax, and this file has to run under `node --test` for the cache tests. */
  protected readonly onError: (message: string) => void;

  constructor(onError: (message: string) => void) {
    this.onError = onError;
    if (!crossOriginIsolated) {
      this.ready = Promise.resolve();
      return;
    }
    this.worker = new Worker(URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" })));
    this.buffer = new SharedArrayBuffer(CHUNK_SIZE * READAHEAD_RUN + 8);
    this.ready = new Promise((resolve) => this.worker?.addEventListener("message", resolve, { once: true }));
  }

  /** Protected only so the cache/readahead math can be exercised without a browser. */
  /**
   * Read a chunk, blocking until the worker fills the shared buffer.
   *
   * The worker is sent a File, never a handle. postMessage structured-clones its payload, and a
   * FileSystemFileHandle is not clonable in every engine - nor is the stand-in built over a file
   * input, which carries methods. Safari threw DataCloneError here, so the worker never received
   * the request, the wait below spun until its timeout, and the game sat on the splash screen
   * forever. A File clones everywhere.
   */
  protected fetchChunkSync(url: string, index: number, file?: File, chunks = 1): Uint8Array {
    if (!this.worker || !this.buffer) {
      this.onError("SharedArrayBuffer unavailable: archives cannot stream.");
      return new Uint8Array(0);
    }
    const state = new Int32Array(this.buffer, 0, 2);
    Atomics.store(state, 0, 0);
    const start = index * CHUNK_SIZE;
    this.worker.postMessage({
      url: file ? "" : new URL(url, location.href).href,
      file,
      start,
      end: start + CHUNK_SIZE * chunks - 1,
      sab: this.buffer,
    });
    const deadline = Date.now() + 60_000;
    while (Atomics.load(state, 0) === 0) {
      if (Date.now() > deadline) {
        this.onError(`Archive fetch timed out: ${url} chunk ${index}`);
        return new Uint8Array(0);
      }
    }
    if (Atomics.load(state, 0) !== 1) {
      this.onError(`Archive fetch failed: ${url} chunk ${index}`);
      return new Uint8Array(0);
    }
    return new Uint8Array(this.buffer.slice(8, 8 + (state[1] ?? 0)));
  }

  private takeChunk(url: string, index: number, file?: File): Uint8Array {
    const key = `${url}#${index}`;
    const cached = this.cache.get(key);
    if (cached) {
      this.cache.delete(key); // re-insert to mark most recently used
      this.cache.set(key, cached);
      return cached;
    }
    // Read ahead only while the file is being read sequentially. Doing it blindly pulled 8x the
    // bytes for scattered reads, and the transfer — not the request count — is the bottleneck.
    const sequential = this.nextIndex.get(url) === index;
    // No reporting from here: this runs inside the engine's synchronous read, and touching the DOM
    // per chunk stalled the boot.
    this.run = sequential ? this.run + 1 : 0;
    // A long sequential run means a map load walking an archive: pull much more per round trip.
    const chunks = sequential ? (this.run > 2 ? READAHEAD_RUN : READAHEAD) : 1;
    const span = this.fetchChunkSync(url, index, file, chunks);
    this.nextIndex.set(url, index + span.length / CHUNK_SIZE);
    for (let offset = 0; offset < span.length; offset += CHUNK_SIZE) {
      const part = span.subarray(offset, Math.min(offset + CHUNK_SIZE, span.length));
      const partKey = `${url}#${index + offset / CHUNK_SIZE}`;
      if (!this.cache.has(partKey)) {
        this.cache.set(partKey, part);
        this.cached += part.length;
      }
    }
    const chunk = this.cache.get(key) ?? span.subarray(0, CHUNK_SIZE);
    while (this.cached > CACHE_LIMIT && this.cache.size > 1) {
      const oldest = this.cache.keys().next().value as string;
      this.cached -= this.cache.get(oldest)?.length ?? 0;
      this.cache.delete(oldest);
    }
    return chunk;
  }

  /** Pull an archive through the network into the browser's disk cache without keeping it in memory.
      Reads that miss the LRU then cost a local cache hit instead of a network round trip. */
  async prime(entries: ArchiveEntry[], onProgress: (done: number, name: string) => void = () => {}): Promise<void> {
    let done = 0;
    for (const entry of entries) {
      if (entry.file) continue; // already local
      const step = CHUNK_SIZE * READAHEAD_RUN;
      for (let start = 0; start < entry.size; start += step) {
        const end = Math.min(start + step, entry.size) - 1;
        try {
          const response = await fetch(entry.url, { headers: { Range: `bytes=${start}-${end}` } });
          await response.arrayBuffer(); // read and drop: the browser keeps it, we do not
        } catch {
          return;
        }
        done += end - start + 1;
        onProgress(done, entry.name);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  async warm(entries: ArchiveEntry[], budget = 256 * 1024 * 1024,
             onProgress: (done: number, name: string) => void = () => {}): Promise<void> {
    let spent = 0;
    for (const entry of entries) {
      for (let index = 0; index * CHUNK_SIZE < entry.size; index += READAHEAD) {
        if (spent >= budget) return;
        const start = index * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE * READAHEAD, entry.size) - 1;
        const key = `${entry.url}#${index}`;
        if (this.cache.has(key)) {
          // Already resident chunks still count as progress, or the bar stalls on cached stretches.
          spent += end - start + 1;
          onProgress(spent, entry.name);
          continue;
        }
        try {
          const bytes = entry.file
            ? new Uint8Array(await entry.file.slice(start, end + 1).arrayBuffer())
            : new Uint8Array(await (await fetch(entry.url, {
                headers: { Range: `bytes=${start}-${end}` },
              })).arrayBuffer());
          for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
            const partKey = `${entry.url}#${index + offset / CHUNK_SIZE}`;
            if (this.cache.has(partKey)) continue;
            const part = bytes.subarray(offset, Math.min(offset + CHUNK_SIZE, bytes.length));
            this.cache.set(partKey, part);
            this.cached += part.length;
          }
          spent += bytes.length;
          onProgress(spent, entry.name);
        } catch {
          return; // link died; reads fall back to fetching on demand
        }
        await new Promise((resolve) => setTimeout(resolve, 0)); // stay off the engine's back
      }
    }
  }

  /** Queue a chunk for the background warmer without blocking the caller. */
  private schedule(entry: ArchiveEntry, index: number): void {
    const key = `${entry.url}#${index}`;
    // Cap in-flight background reads: firing one per miss opened hundreds of sockets and the server
    // started refusing connections.
    if (this.cache.has(key) || this.pending.has(key) || this.pending.size >= 8) return;
    this.pending.add(key);
    const start = index * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE * READAHEAD, entry.size) - 1;
    const source = entry.file
      ? entry.file.slice(start, end + 1).arrayBuffer()
      : fetch(entry.url, { headers: { Range: `bytes=${start}-${end}` } }).then((r) => r.arrayBuffer());
    void source
      .then((buffer) => {
        const bytes = new Uint8Array(buffer);
        for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
          const partKey = `${entry.url}#${index + offset / CHUNK_SIZE}`;
          if (this.cache.has(partKey)) continue;
          const part = bytes.subarray(offset, Math.min(offset + CHUNK_SIZE, bytes.length));
          this.cache.set(partKey, part);
          this.cached += part.length;
        }
      })
      .catch(() => {})
      .finally(() => this.pending.delete(key));
  }

  /** 1 if [offset, offset+size) of the named archive is readable without touching the network;
      otherwise kick background fetches for the missing chunks and return 0. Called by the engine
      once per skipped sound — keep it allocation-light, never touch the DOM. */
  ensure(archive: string, offset: number, size: number): number {
    const entry = this.byName.get((archive.split(/[\\/]/).pop() ?? archive).toLowerCase());
    if (!entry || entry.file) return 1; // unknown → behave as before; local disk → fast reads
    const first = Math.floor(offset / CHUNK_SIZE);
    const last = Math.floor((offset + Math.max(1, size) - 1) / CHUNK_SIZE);
    let resident = 1;
    for (let index = first; index <= last; index += 1) {
      const key = `${entry.url}#${index}`;
      const chunk = this.cache.get(key);
      if (chunk) {
        this.cache.delete(key); // re-insert as most recent: pinned while the engine waits on it
        this.cache.set(key, chunk);
        continue;
      }
      resident = 0;
      this.schedule(entry, index);
      index += READAHEAD - 1; // schedule() pulls READAHEAD chunks starting at index
    }
    return resident;
  }

  mount(module: EmscriptenModule, entry: ArchiveEntry): void {
    const FS = module.FS as EmscriptenFS;
    this.byName.set(entry.name.toLowerCase(), entry);
    FS.mkdirTree(entry.mount);
    const node = FS.createFile(entry.mount, entry.name, {}, true, false);
    const size = entry.size;
    Object.defineProperty(node, "usedBytes", { get: () => size });
    node.stream_ops = {
      llseek: (stream, offset, whence) => {
        let position = offset;
        if (whence === 1) position += stream.position;
        else if (whence === 2) position = size + offset;
        if (position < 0) throw new FS.ErrnoError(28);
        return position;
      },
      read: (_stream, buffer, offset, length, position) => {
        const end = Math.min(size, position + length);
        if (position >= end) return 0;
        const firstChunk = Math.floor(position / CHUNK_SIZE);
        const lastChunk = Math.floor((end - 1) / CHUNK_SIZE);
        let written = 0;
        // No silence-for-missing-bytes here: a decoder fed zeros caches a silent sound forever.
        // The engine skips cold sounds before opening them, so any read that reaches this point
        // is expected to block until the real bytes exist.
        for (let index = firstChunk; index <= lastChunk; index += 1) {
          const chunk = this.takeChunk(entry.url, index, entry.file);
          const chunkStart = index * CHUNK_SIZE;
          const from = Math.max(position, chunkStart) - chunkStart;
          const to = Math.min(end, chunkStart + chunk.length) - chunkStart;
          if (to <= from) break; // short chunk: fetch failed or EOF
          buffer.set(chunk.subarray(from, to), offset + written);
          written += to - from;
        }
        return written;
      },
    };
  }
}

/** The server-side archive manifest. `url` is the game's own endpoint — Generals serves
    /GeneralsXAssets, Vice City serves /ViceAssets. */
export async function loadManifest(url: string): Promise<AssetManifest> {
  const response = await fetch(url);
  return (await response.json()) as AssetManifest;
}
