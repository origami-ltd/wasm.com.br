/**
 * One call that builds a game page.
 *
 * A port supplies what is genuinely its own — its name, where its log goes, which GPU API it
 * needs, how to recognise its install — and gets the whole shell back: chrome, logging and log
 * shipping, the status line and progress bar, stall detection, letterboxing, fullscreen, pointer
 * capture, sound, and the first-run gate.
 */

import { mountGate, type Gate } from "@origami-ltd/ui/gate";
import { checkCapabilities, isHandheld, type Capability, type GpuKind } from "@wasm/runtime";

import { el, render, type ChromeOptions } from "@origami-ltd/ui/chrome";
import { createLogger, createStatus, watchStall, type Logger, type Status } from "./report";
import {
  mountDisplay, mountPointer, mountSound, unlockAudio,
  type PointerOptions, type Sound,
} from "./display";

export { el, render, headerLinks, githubLink, type ChromeOptions } from "@origami-ltd/ui/chrome";
export { SITES, siteUrl, productionUrl, type SiteKey } from "@origami-ltd/ui/sites";
export { query, hostInstall } from "./query";
export { createLogger, createStatus, watchStall, mb, type Logger, type Status } from "./report";
export {
  mountDisplay, mountPointer, mountSound, unlockAudio,
  type PointerOptions, type Sound, type SoundOptions,
} from "./display";

export interface ShellOptions extends ChromeOptions {
  /** localStorage prefix and gate picker id — must differ between the two pages. */
  key: string;
  /** Full game name, shown in the gate. */
  game: string;
  /** Which GPU API the engine needs, for the capability check. */
  gpu: GpuKind;
  /** What the engine reserves up front (-sINITIAL_MEMORY). Checked before a byte is downloaded. */
  heapBytes?: number;
  /** Where to find the install, shown in the gate. Raw HTML. */
  help: string;
  /** Host log sink. Omit on static hosting and nothing is shipped. */
  logEndpoint?: string;
  /** Narrate the boot from the engine's own output. */
  onLine?: (line: string) => void;
  /** Validate and remember a picked install. Returns a message, or undefined on success. */
  onPick: (root: FileSystemDirectoryHandle) => Promise<string | undefined>;
  /** Engine frame counter, for the stall detector. */
  frame?: () => number | undefined;
  /** Tell the engine about the mute state. */
  applyMute?: (muted: boolean) => void;
  /** Change the engine's render resolution live, if it can. Enables fullscreen-at-native. */
  setResolution?: (width: number, height: number) => void;
  /** Pointer capture. Omitted entirely for games that never lock. */
  pointer?: PointerOptions;
  /** Extra work on Reset, before localStorage is cleared and the page reloads. */
  onReset?: () => void;
}

export interface Shell {
  log: Logger;
  status: Status;
  gate: Gate;
  sound: Sound;
  capabilities: Capability[];
  /** Re-fit the canvas. The engine changing its backing size already triggers this. */
  fit: () => void;
}

export function createShell(options: ShellOptions): Shell {
  render(el("app"), options);

  const log = createLogger({ endpoint: options.logEndpoint, onLine: options.onLine });
  const status = createStatus();
  const { fit } = mountDisplay({ setResolution: options.setResolution });

  // Before the engine exists: it builds its AudioContext during startup, well before the player
  // has clicked anything, so the patch has to be in place first.
  unlockAudio(log);

  const sound = mountSound({
    key: options.key,
    apply: (muted) => options.applyMute?.(muted),
  });

  if (options.pointer) mountPointer(options.pointer);
  if (options.frame) watchStall({ frame: options.frame, log });

  const capabilities = checkCapabilities(options.gpu, options.heapBytes);
  const gate = mountGate(el("firstrun"), {
    game: options.game,
    help: options.help,
    capabilities,
    handheld: isHandheld(),
    pickerId: `${options.key}-install`,
    onPick: options.onPick,
  });

  if (gate.blocked) {
    gate.show();
    status.report("Unsupported browser", "see what this page needs");
  }

  el("reset").addEventListener("click", () => {
    options.onReset?.();
    localStorage.clear();
    location.reload();
  });

  return { log, status, gate, sound, capabilities, fit };
}
