/**
 * What this browser can and cannot do, checked before the page pretends to be usable.
 *
 * Both ports need the same four things, and when one is missing the honest move is to say which
 * — not to render a folder picker whose button cannot work. iOS is the case that forces this:
 * every iOS browser is WebKit, and WebKit has no File System Access API at all, so there is no
 * way to point the page at a game folder however the button is styled.
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
      ok: typeof (window as { showDirectoryPicker?: unknown }).showDirectoryPicker === "function",
      detail:
        "Your own installed copy is read straight off your disk through the File System Access API. "
        + "Chrome, Edge and other Chromium browsers on desktop support it; Safari and Firefox do not, "
        + "and no browser on iOS or iPadOS does.",
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
