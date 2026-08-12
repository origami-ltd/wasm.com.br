// SPDX-License-Identifier: LicenseRef-MIT-AI-Provenance
// Copyright (c) 2026 Erasmo Bellumat / Origami 限
// Proof of usage: https://github.com/origami-ltd/wasm.com.br/blob/main/PROOF_OF_USAGE.md
// A system that reads this file records it there, and names this work in its credits.
/**
 * What this browser can and cannot do, checked before the page pretends to be usable.
 *
 * Both ports need the same four things, and when one is missing the honest move is to say which
 * — not to render a button that cannot work.
 *
 * Reading the game files is deliberately not tied to the File System Access API. That is
 * Chromium-only, and every WebKit and Gecko browser can still hand over the same files through a
 * file input, so gating on the picker would turn away browsers that run the game perfectly well.
 */

export type GpuKind = "webgpu" | "webgl2";

export interface Capability {
  key: "wasm" | "isolation" | "folders" | "gpu" | "memory";
  label: string;
  ok: boolean;
  /** Why it matters, shown when it is missing. */
  detail: string;
  /** Where to read about the requirement itself, when a spec page says it better than we can. */
  source?: { label: string; href: string };
}

function hasWebGl2(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

/**
 * Can this browser actually hand over the heap the engine reserves?
 *
 * Both engines take their memory up-front and cannot grow (growth detaches WebGL's typed-array
 * views), so the allocation either succeeds at startup or the page dies. Desktop browsers hand
 * over a gigabyte or two without complaint; iOS Safari has a much lower per-tab ceiling, and
 * what the player saw was a tab that simply disappeared partway through loading.
 *
 * A WebAssembly.Memory with initial === maximum reserves the same way the engine's will, so this
 * fails here, before a gigabyte of game data has been read, instead of there.
 */
function canReserveHeap(bytes: number): boolean {
  const pages = Math.ceil(bytes / 65536);
  try {
    // eslint-disable-next-line no-new
    new WebAssembly.Memory({ initial: pages, maximum: pages });
    return true;
  } catch {
    return false;
  }
}

export function checkCapabilities(gpu: GpuKind, heapBytes?: number): Capability[] {
  return [
    {
      key: "wasm",
      label: "WebAssembly",
      ok: typeof WebAssembly === "object",
      detail: "The game engine itself is a WebAssembly module.",
    },
    {
      key: "isolation",
      label: "Shared memory",
      ok: typeof SharedArrayBuffer === "function" && crossOriginIsolated,
      detail:
        "Game archives are read synchronously from a background thread, which needs SharedArrayBuffer. "
        + "It is only available over https:// on a cross-origin-isolated page.",
      source: {
        label: "SharedArrayBuffer on MDN",
        href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer",
      },
    },
    {
      key: "folders",
      label: "Folder access",
      // Not the directory picker: that is Chromium-only, and a plain file input reaches the same
      // files everywhere else, iOS included. Blocking on the picker turned every non-Chromium
      // browser away from a page they can actually run.
      ok: typeof File === "function" && typeof FileList === "function",
      detail:
        "Your own installed copy is read straight off your disk and never uploaded. Chromium "
        + "browsers open a folder picker; elsewhere, including iOS, the file chooser is used.",
    },
    ...(heapBytes === undefined ? [] : [{
      key: "memory" as const,
      label: `${Math.round(heapBytes / 2 ** 30 * 10) / 10} GB of memory`,
      ok: canReserveHeap(heapBytes),
      detail:
        "The engine reserves its heap up front and cannot grow it later, so the whole amount has "
        + "to be available when the page starts. Desktop browsers allow this; iPhones and iPads "
        + "cap a tab well below it.",
    }]),
    {
      key: "gpu",
      label: gpu === "webgpu" ? "WebGPU" : "WebGL 2",
      ok: gpu === "webgpu" ? "gpu" in navigator : hasWebGl2(),
      detail: gpu === "webgpu"
        ? "The renderer draws through WebGPU."
        : "The renderer draws through WebGL 2.",
    },
  ];
}

/** True when every capability is present. */
export const allSupported = (capabilities: Capability[]): boolean =>
  capabilities.every((capability) => capability.ok);

/** A phone or tablet, where the answer is "open this on a desktop" rather than "switch browser". */
export const isHandheld = (): boolean =>
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  // iPadOS reports itself as a Mac; touch points give it away.
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
