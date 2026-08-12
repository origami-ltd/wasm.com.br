import { ARCHIVE_EXTENSIONS, archiveKind, directoryFromFiles, extractInto, readArchive } from "@wasm/runtime";
/**
 * The first-run gate: "point me at your copy of the game".
 *
 * Framework-free on purpose — the game shells are vanilla TS. Both ports render exactly this,
 * so a layout or capability fix lands in one place instead of two.
 *
 * It checks the browser before it offers the picker, by feature and never by name — a browser
 * gets an honest "this is what is missing" rather than a button that cannot work.
 *
 * Nothing here is Chromium-only any more. The directory picker is, but the file input reaches the
 * same files everywhere else, so Safari and Firefox load a game like anything else.
 */

export interface GateCapability {
  label: string;
  ok: boolean;
  detail: string;
  /** Optional citation for the requirement, rendered after the detail. */
  source?: { label: string; href: string };
}

export interface GateOptions {
  /** The game's name, used in the copy. */
  game: string;
  /** Where to find the install, as HTML. Shown behind the (i) button. */
  help: string;
  capabilities: GateCapability[];
  /** True on phones/tablets, where the advice is "use a desktop" not "switch browser". */
  handheld: boolean;
  /** showDirectoryPicker id, so the browser reopens at the last place. */
  pickerId: string;
  /** Resolve to an error message to display, or undefined when the pick was good. */
  onPick: (root: FileSystemDirectoryHandle) => Promise<string | undefined>;
}

export interface Gate {
  show(): void;
  hide(): void;
  /** Message under the picker — used for "click to re-allow access to your folder". */
  setNote(text: string): void;
  /** True when the browser cannot run the game at all. */
  readonly blocked: boolean;
}

const escape = (value: string): string =>
  value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

function requirements(capabilities: GateCapability[]): string {
  const rows = capabilities.map((capability) => `
    <li class="${capability.ok ? "ogx-req-ok" : "ogx-req-missing"}">
      <span class="ogx-req-mark" aria-hidden="true">${capability.ok ? "✓" : "✗"}</span>
      <span class="ogx-req-label">${escape(capability.label)}
        <span class="ogx-req-detail">${escape(capability.detail)}${capability.source ? `
          <a href="${escape(capability.source.href)}" target="_blank" rel="noopener"
             class="underline decoration-dotted underline-offset-2">${escape(capability.source.label)}</a>` : ""}</span>
      </span>
    </li>`).join("");
  return `<ul class="ogx-req">${rows}</ul>`;
}

export function mountGate(host: HTMLElement, options: GateOptions): Gate {
  const missing = options.capabilities.filter((capability) => !capability.ok);
  const blocked = missing.length > 0;

  const advice = options.handheld
    ? `Check the list below. Picking the game files works here, but these are full desktop
       builds: they reserve their memory up front, and they are played with a keyboard and mouse
       or a connected controller — there are no touch controls.`
    : `Check the list below for what this browser is missing.`;

  host.className = "ogx-gate";
  host.hidden = true;
  host.innerHTML = `
    <div class="ogx-panel ogx-gate-card" style="--ogx-panel-surface: var(--raised)">
      ${blocked ? `
        <h2 class="ogx-glow m-0 mb-2 text-base uppercase tracking-[0.12em] text-accent sm:text-lg">
          This browser can't run it
        </h2>
        <p class="mb-5 text-[13px] leading-relaxed text-muted">${advice}</p>
        <div class="border border-line bg-surface p-3 sm:p-4">
          ${requirements(options.capabilities)}
        </div>
      ` : `
        <h2 class="ogx-glow m-0 mb-2 text-base uppercase tracking-[0.12em] text-accent sm:text-lg">
          Load your game files
        </h2>
        <p class="mb-5 text-[13px] leading-relaxed text-muted">
          This page runs your own copy of <strong class="text-ink">${escape(options.game)}</strong>.
          Nothing is downloaded and nothing is redistributed — the files never leave your machine.
        </p>
        <div class="border border-line bg-surface p-3 sm:p-4">
          <h3 class="m-0 mb-2 flex flex-wrap items-center gap-2 text-sm uppercase tracking-[0.08em] text-accent">
            Select your game folder or installation files
            <button type="button" data-gate="info" aria-label="Where to find the game folder"
                    class="ogx-hud-button h-6 min-h-6 w-6 shrink-0 rounded-full px-0 text-xs [clip-path:none]">i</button>
          </h3>
          <p class="text-[13px] leading-relaxed text-muted">
            Point the browser at your installed copy, or at the folder holding a
            <strong class="text-ink">.zip</strong>, <strong class="text-ink">.iso</strong> or
            <strong class="text-ink">.bin/.cue</strong> you never unpacked — that gets extracted
            in place and becomes the game folder. Everything stays on your machine.
          </p>
          <button type="button" data-gate="pick" class="ogx-hud-button mt-3 w-full sm:w-auto">Select folder or file</button>
          <input type="file" data-gate="files" multiple webkitdirectory directory hidden>
          <input type="file" data-gate="archive" hidden accept=".zip,.iso,.img,.bin,.cue,.rar">
          <p data-gate="note" class="mt-2 min-h-4 text-xs leading-relaxed text-signal"></p>
        </div>
        <div data-gate="help" hidden
             class="mt-4 space-y-2 border-l-[3px] border-accent bg-surface p-3 text-xs leading-relaxed text-muted sm:p-3.5">
          ${options.help}
        </div>
      `}
    </div>`;

  const find = (name: string) => host.querySelector<HTMLElement>(`[data-gate="${name}"]`);

  find("info")?.addEventListener("click", () => {
    const help = find("help");
    if (help) help.hidden = !help.hidden;
  });

  const setNote = (text: string) => {
    const note = find("note");
    if (note) note.textContent = text;
  };

  /**
   * Find an archive in the picked folder, recursively.
   *
   * The install is tried first and only searched if it is not already there — a real install
   * folder must never be ignored in favour of an old zip sitting next to it.
   */
  const findArchive = async (
    directory: FileSystemDirectoryHandle,
    depth = 0,
  ): Promise<{ file: File; parent: FileSystemDirectoryHandle } | undefined> => {
    if (depth > 3) return undefined; // deep enough for Downloads/<game>/<disc>, not a whole drive
    const subdirectories: FileSystemDirectoryHandle[] = [];
    for await (const [name, handle] of (directory as unknown as {
      entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    }).entries()) {
      if (handle.kind === "directory") {
        subdirectories.push(handle as FileSystemDirectoryHandle);
        continue;
      }
      const lower = name.toLowerCase();
      // .cue only describes the .bin beside it, so the .bin is what gets read.
      if (lower.endsWith(".cue")) continue;
      if (ARCHIVE_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
        return { file: await (handle as FileSystemFileHandle).getFile(), parent: directory };
      }
    }
    for (const subdirectory of subdirectories) {
      const found = await findArchive(subdirectory, depth + 1);
      if (found) return found;
    }
    return undefined;
  };

  const deliver = async (root: FileSystemDirectoryHandle) => {
    setNote("Scanning…");
    const installed = await options.onPick(root);
    if (!installed) {
      setNote("Install found. Starting…");
      return;
    }

    // No install here. Before reporting that, look for something to unpack.
    //
    // Unpacking repeats, because archives nest in practice: the Vice City disc download is a zip
    // holding a .bin, and the .bin is a MODE1/2352 image holding the actual files. One pass would
    // stop at the .bin and report no install.
    let message: string | undefined = installed;
    const opened = new Set<string>();
    for (let round = 0; round < 3; round += 1) {
      const archive = await findArchive(root);
      if (!archive || opened.has(archive.file.name)) break;
      opened.add(archive.file.name);

      if (archiveKind(archive.file.name) === "rar") {
        setNote(`${archive.file.name}: RAR cannot be opened in the browser — extract it first.`);
        return;
      }

      try {
        setNote(`Reading ${archive.file.name}…`);
        const entries = await readArchive(archive.file);
        // Extract beside the archive, so the folder the player chose becomes the game folder and
        // a second visit skips all of this.
        await extractInto(archive.parent, entries, (done, total, path) => {
          setNote(`Extracting ${archive.file.name}: ${done}/${total} — ${path}`);
        });
        setNote("Extracted. Checking…");
        message = await options.onPick(archive.parent);
        if (!message) {
          setNote("Install found. Starting…");
          return;
        }
      } catch (error) {
        setNote(`Could not read ${archive.file.name}: ${(error as Error).message}`);
        return;
      }
    }
    // Name what is actually there. A disc that unpacks into data1.hdr + data*.cab is an
    // InstallShield installer, not an installed game — the files are real but every one of them
    // is still inside the cabinet, so "no install here" reads as though the wrong folder was
    // picked when the folder was right and the disc simply needs installing first.
    if (message) {
      const names: string[] = [];
      for await (const [name, handle] of (root as unknown as {
        entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
      }).entries()) {
        if (handle.kind === "file") names.push(name.toLowerCase());
      }
      if (names.some((n) => n.endsWith(".hdr")) && names.some((n) => /^data\d*\.cab$/.test(n))) {
        setNote(
          "That is an installation disc, not an installed copy — the game is still packed inside "
          + "its .cab files. Install it once on a PC (or with unshield), then pick that folder.",
        );
        return;
      }
    }
    setNote(message ?? "Install found. Starting…");
  };

  // Fallback path: Firefox, Safari and everything on iOS have no directory picker, so the file
  // input is the only way in. directoryFromFiles gives the selection the same shape the picker
  // would have returned, which keeps onPick unaware of which one the browser used.
  const input = find("files") as HTMLInputElement | null;
  input?.addEventListener("change", async () => {
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;
    try {
      await deliver(directoryFromFiles(files) as unknown as FileSystemDirectoryHandle);
    } catch (error) {
      console.debug("folder selection failed", error);
      setNote("Could not read that selection.");
    }
  });

  find("pick")?.addEventListener("click", async () => {
    // No resuming here. This button says "select", so it selects — reopening the remembered
    // folder instead made it impossible to choose a different one, and on a browser where the
    // lookup never settled it locked the gate outright. Resuming happens on Play, where it is
    // what the player asked for.
    const picker = (window as unknown as {
      showDirectoryPicker?: (o: object) => Promise<FileSystemDirectoryHandle>;
    }).showDirectoryPicker;

    if (!picker) {
      input?.click();
      return;
    }

    try {
      await deliver(await picker({ id: options.pickerId, mode: "readwrite" }));
    } catch (error) {
      console.debug("folder selection cancelled", error);
      setNote("");
    }
  });

  return {
    show: () => { host.hidden = false; },
    hide: () => { host.hidden = true; },
    setNote: (text: string) => {
      const note = find("note");
      if (note) note.textContent = text;
    },
    blocked,
  };
}
