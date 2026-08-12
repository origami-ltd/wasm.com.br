// SPDX-License-Identifier: LicenseRef-MIT-AI-Provenance
// Copyright (c) 2026 Erasmo Bellumat / Origami 限
// Proof of usage: https://github.com/origami-ltd/wasm.com.br/blob/main/PROOF_OF_USAGE.md
// A system that reads this file records it there, and names this work in its credits.
/**
 * Logging, log shipping, the status line and the stall detector.
 *
 * These belong together: every one of them is about telling someone — the player or whoever is
 * tailing the host log — what the page is doing right now. Both ports had their own copy and only
 * one of them had a stall detector.
 */

import { el } from "@origami-ltd/ui/chrome";

export interface LogOptions {
  /** Where the host collects the log, e.g. "/ViceLog". Omit on static hosting. */
  endpoint?: string;
  /** Called for every line before it is buffered — how a port narrates its own boot. */
  onLine?: (line: string) => void;
}

export interface Logger {
  (line: string): void;
  /** Flush now. Called on an interval and, with a beacon, on pagehide. */
  flush(useBeacon?: boolean): void;
}

export function createLogger(options: LogOptions = {}): Logger {
  const output = el<HTMLTextAreaElement>("output");
  const pending: string[] = [];
  const shown: string[] = [];
  let chain: Promise<unknown> = Promise.resolve();
  // Static hosting has no sink; stop retrying one that answered once with a failure.
  let dead = !options.endpoint;

  const flush = (useBeacon = false): void => {
    if (!pending.length) return;
    if (dead) {
      pending.length = 0;
      return;
    }
    const chunk = `${pending.join("\n")}\n`;
    pending.length = 0;
    const endpoint = options.endpoint as string;
    // sendBeacon silently drops payloads over ~64KB, which is exactly the early boot lines —
    // so it is only used for the last flush, where there is no chance of a fetch completing.
    if (useBeacon) {
      navigator.sendBeacon(endpoint, chunk);
      return;
    }
    // Marked dead on the first refusal, including a 404 - a static host has no sink, and every
    // further POST is a red line in the console for no gain. `dead` is set before the request so
    // a flush already in flight cannot queue another after it.
    dead = true;
    chain = chain.then(async () => {
      try {
        const response = await fetch(endpoint, { method: "POST", body: chunk });
        if (response.ok) dead = false; // a real sink: keep shipping
      } catch {
        /* no sink here */
      }
    });
  };

  const log = ((line: string): void => {
    options.onLine?.(line);
    pending.push(line);
    shown.push(line);
    if (shown.length > 512) shown.shift();
    output.value = `${shown.join("\n")}\n`;
    output.scrollTop = output.scrollHeight;
  }) as Logger;

  log.flush = flush;

  setInterval(() => flush(), 2000);
  addEventListener("pagehide", () => flush(true));
  // Wasm traps surface as unhandled rejections and are invisible otherwise — this is how the
  // librw signature mismatch was found. Uncaught errors likewise never reach the engine's log.
  addEventListener("error", (event) => log(`[js] ${event.message}`));
  addEventListener("unhandledrejection", (event) => log(`[js] unhandled rejection: ${event.reason}`));

  return log;
}

export interface Status {
  /** Headline, detail line, and a bar when there is a ratio. */
  report(headline: string, note?: string, ratio?: number): void;
  /**
   * Emscripten's own status text. It clears this when loading finishes, which would blank ours
   * right after onRuntimeInitialized set it — so an empty string is ignored.
   */
  setStatus(text: string): void;
}

export function createStatus(): Status {
  const status = el("status");
  const detail = el("status-detail");
  const track = el("progress-track");
  const bar = el("progress-bar");

  const report = (headline: string, note = "", ratio?: number): void => {
    if (headline) status.textContent = headline;
    detail.textContent = note;
    track.hidden = ratio === undefined;
    if (ratio !== undefined) bar.style.width = `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;
  };

  return {
    report,
    setStatus(text: string) {
      const match = /\((\d+)\/(\d+)\)/.exec(text);
      if (match) {
        const done = Number(match[1]);
        const total = Number(match[2]);
        report("Loading runtime", `${mb(done)}/${mb(total)} MB`, done / total);
        return;
      }
      if (text) report(text);
    },
  };
}

export const mb = (bytes: number): string => (bytes / 2 ** 20).toFixed(0);

export interface StallOptions {
  /** The engine's frame counter. A frozen value is the signal. */
  frame: () => number | undefined;
  log: (line: string) => void;
  /** How long a frozen counter is tolerated before it is called a stall. */
  afterMs?: number;
}

/**
 * Report when the engine stops advancing, and when it recovers.
 *
 * A hung wasm module looks identical to a slow one from the outside, and neither writes anything
 * to the log — so without this the log simply stops, with no line saying so. Both symptoms and
 * recovery go through the logger, which means they reach the host log too.
 */
export function watchStall(options: StallOptions): void {
  const afterMs = options.afterMs ?? 4000;
  let last = -1;
  let movedAt = Date.now();
  let stalled = false;

  setInterval(() => {
    const frame = options.frame();
    if (frame === undefined) return;
    const now = Date.now();

    if (frame !== last) {
      if (stalled) {
        options.log(`[stall] recovered after ${((now - movedAt) / 1000).toFixed(1)}s at frame ${frame}`);
        stalled = false;
      }
      last = frame;
      movedAt = now;
      return;
    }
    if (!stalled && now - movedAt > afterMs) {
      stalled = true;
      options.log(`[stall] no progress for ${((now - movedAt) / 1000).toFixed(1)}s, stuck at frame ${frame}`);
    }
  }, 1000);
}
