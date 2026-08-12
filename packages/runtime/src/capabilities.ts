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
  key: "wasm" | "isolation" | "folders" | "gpu";
  label: string;
  ok: boolean;
  /** Why it matters, shown when it is missing. */
  detail: string;
}

function hasWebGl2(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export function checkCapabilities(gpu: GpuKind): Capability[] {
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
