/**
 * The chunk cache is the piece that has already gone wrong expensively once: blind readahead over
 * scattered reads pulled ~35 GB across ~9000 requests for a single map load. These assertions pin
 * the three behaviours that fix stayed on — readahead only while sequential, escalation once a run
 * is established, and no network at all for a resident chunk.
 *
 *   node --test packages/runtime/test/streaming.test.ts
 */
import assert from "node:assert/strict";
import { test } from "node:test";

// The constructor reads this before touching Worker/SharedArrayBuffer; false keeps it off both.
(globalThis as Record<string, unknown>).crossOriginIsolated = false;

const { ArchiveStreamer, CHUNK_SIZE, READAHEAD, READAHEAD_RUN } = await import("../src/streaming.ts");

type Read = (buffer: Uint8Array, offset: number, length: number, position: number) => number;

/** A streamer whose "network" is a byte generator, recording how much each call asked for. */
class RecordingStreamer extends ArchiveStreamer {
  readonly requests: { index: number; chunks: number }[] = [];

  protected override fetchChunkSync(_url: string, index: number, _handle?: unknown, chunks = 1): Uint8Array {
    this.requests.push({ index, chunks });
    return new Uint8Array(CHUNK_SIZE * chunks).fill(1);
  }
}

/** Just enough emscripten FS for mount() to attach its stream_ops, and hand them back. */
function mountRecording(size: number): { streamer: RecordingStreamer; read: Read } {
  const streamer = new RecordingStreamer(() => {});
  const node: Record<string, unknown> = {};
  const module = {
    FS: {
      mkdirTree: () => {},
      createFile: () => node,
      ErrnoError: class extends Error {},
    },
  };
  streamer.mount(module as never, { mount: "/game", name: "data.img", url: "/data.img", size });
  const ops = node.stream_ops as { read: (s: unknown, b: Uint8Array, o: number, l: number, p: number) => number };
  return { streamer, read: (buffer, offset, length, position) => ops.read({ position: 0 }, buffer, offset, length, position) };
}

const readChunk = (read: Read, index: number) =>
  read(new Uint8Array(CHUNK_SIZE), 0, CHUNK_SIZE, index * CHUNK_SIZE);

test("a scattered read never pulls more than the chunk it was asked for", () => {
  const { streamer, read } = mountRecording(CHUNK_SIZE * 4096);

  readChunk(read, 0);
  readChunk(read, 900);   // nowhere near chunk 1: not a sequential run
  readChunk(read, 40);

  assert.deepEqual(streamer.requests.map((request) => request.chunks), [1, 1, 1]);
});

test("a sequential run escalates readahead instead of paying per chunk", () => {
  const { streamer, read } = mountRecording(CHUNK_SIZE * 4096);

  // Walk the archive the way a map load does. Chunks pulled by readahead are served from cache,
  // so only the misses reach fetchChunkSync.
  for (let index = 0; index < 200; index += 1) readChunk(read, index);

  const asked = streamer.requests.map((request) => request.chunks);
  assert.deepEqual(asked.slice(0, 4), [1, READAHEAD, READAHEAD, READAHEAD_RUN],
    "first miss is cold, then readahead, then the full run once the pattern is established");
  assert.ok(asked.at(-1) === READAHEAD_RUN, "a long walk stays on the big reads");
  // The naive version issued one request per chunk; this must stay far below that.
  assert.ok(streamer.requests.length < 20, `200 sequential chunks cost ${streamer.requests.length} requests`);
});

test("a resident chunk costs no request at all", () => {
  const { streamer, read } = mountRecording(CHUNK_SIZE * 16);

  readChunk(read, 0);
  const afterFirst = streamer.requests.length;
  for (let repeat = 0; repeat < 10; repeat += 1) readChunk(read, 0);

  assert.equal(streamer.requests.length, afterFirst);
});

test("a read spanning two chunks returns the whole span", () => {
  const { streamer, read } = mountRecording(CHUNK_SIZE * 16);

  const buffer = new Uint8Array(CHUNK_SIZE);
  const written = read(buffer, 0, CHUNK_SIZE, CHUNK_SIZE / 2); // straddles chunk 0 and chunk 1

  assert.equal(written, CHUNK_SIZE);
  assert.ok(buffer.every((byte) => byte === 1));
  assert.ok(streamer.requests.length >= 2);
});

test("a read past the end of the archive stops at the end", () => {
  const { read } = mountRecording(CHUNK_SIZE + 100);

  assert.equal(read(new Uint8Array(CHUNK_SIZE), 0, CHUNK_SIZE, CHUNK_SIZE), 100);
  assert.equal(read(new Uint8Array(16), 0, 16, CHUNK_SIZE + 100), 0);
});
