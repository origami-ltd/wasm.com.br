/**
 * One call that builds a game page.
 *
 * A port supplies what is genuinely its own — its name, where its log goes, which GPU API it
 * needs, how to recognise its install — and gets the whole shell back: chrome, logging and log
 * shipping, the status line and progress bar, stall detection, letterboxing, fullscreen, pointer
 * capture, sound, and the first-run gate.
 */

import { mountGate, type Gate } from "@origami-ltd/ui/gate";
import { checkCapabilities, isHandheld, type Capability, type EmscriptenModule, type GpuKind } from "@wasm/runtime";

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
  /**
   * Validate and remember a picked install. Returns a message, or undefined on success.
   *
   * Only remembers it. Getting the files into a running engine is `mountPicked`, so that the
   * two ports share one answer to "what happens after a successful pick".
   */
  onPick: (root: FileSystemDirectoryHandle) => Promise<string | undefined>;
  /**
   * Mount a just-picked install into an engine that is paused waiting for it.
   *
   * Without this the only way to use a new pick is to reload, and reloading loses it: the saved
   * File System Access handle comes back from IndexedDB needing its permission re-granted, and a
   * fresh page load has no user gesture to grant it with. The gate reopens, the player picks
   * again, and it reloads again - a loop with no way out. The permission is live at the moment of
   * the pick, so that is the moment to use it.
   */
  mountPicked?: (instance: EmscriptenModule, root: FileSystemDirectoryHandle) => Promise<void>;
  /** The run dependency the engine holds while it has no game files. */
  assetDependency?: string;
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
  /**
   * Hand the shell an engine that is paused on its asset dependency.
   *
   * Called from preRun by whichever port is booting. The shell keeps it so a later pick can be
   * mounted straight in rather than going through a page load.
   */
  holdEngine(instance: EmscriptenModule): void;
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

  /** The engine waiting for game files, if one is. */
  let waiting: EmscriptenModule | undefined;

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
    onPick: async (root) => {
      const problem = await options.onPick(root);
      if (problem) return problem;

      // A pick is only useful to an engine that is already waiting; feed it directly.
      if (waiting && options.mountPicked) {
        const instance = waiting;
        waiting = undefined;
        await options.mountPicked(instance, root);
        if (options.assetDependency) instance.removeRunDependency(options.assetDependency);
        gate.hide();
        return undefined;
      }

      // Nothing running yet - the player opened the picker before starting the engine, so a
      // reload is the only way in, and there is no live permission to lose.
      setTimeout(() => location.replace(location.pathname), 700);
      return undefined;
    },
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

  return { holdEngine: (instance) => { waiting = instance; }, log, status, gate, sound, capabilities, fit };
}
