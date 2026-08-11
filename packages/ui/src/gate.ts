/**
 * The first-run gate: "point me at your copy of the game".
 *
 * Framework-free on purpose — the game shells are vanilla TS. Both ports render exactly this,
 * so a layout or capability fix lands in one place instead of two.
 *
 * It checks the browser before it offers the picker. A phone gets an honest "not here, and this
 * is why" instead of a button that cannot work: every iOS browser is WebKit, and WebKit has no
 * File System Access API, so there is no folder to pick however nice the dialog looks.
 */

export interface GateCapability {
  label: string;
  ok: boolean;
  detail: string;
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
        <span class="ogx-req-detail">${escape(capability.detail)}</span>
      </span>
    </li>`).join("");
  return `<ul class="ogx-req">${rows}</ul>`;
}

export function mountGate(host: HTMLElement, options: GateOptions): Gate {
  const missing = options.capabilities.filter((capability) => !capability.ok);
  const blocked = missing.length > 0;

  const advice = options.handheld
    ? `This is a desktop-only game page. Phones and tablets cannot read a game folder or give the
       renderer the memory it needs — open <strong>wasm.com.br</strong> on a computer.`
    : `Open this page in <strong>Chrome</strong> or <strong>Edge</strong> on a desktop.`;

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
            Select your game folder
            <button type="button" data-gate="info" aria-label="Where to find the game folder"
                    class="ogx-hud-button h-6 min-h-6 w-6 shrink-0 rounded-full px-0 text-xs [clip-path:none]">i</button>
          </h3>
          <p class="text-[13px] leading-relaxed text-muted">
            Point the browser at your installed copy. The files stay on your machine.
          </p>
          <button type="button" data-gate="pick" class="ogx-hud-button mt-3 w-full sm:w-auto">Select game folder</button>
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

  find("pick")?.addEventListener("click", async () => {
    const note = find("note");
    const picker = (window as unknown as {
      showDirectoryPicker?: (o: object) => Promise<FileSystemDirectoryHandle>;
    }).showDirectoryPicker;
    if (!picker) return; // capability check already covered this
    try {
      const root = await picker({ id: options.pickerId, mode: "read" });
      if (note) note.textContent = "Scanning…";
      const error = await options.onPick(root);
      if (note) note.textContent = error ?? "Install found. Starting…";
    } catch (error) {
      console.debug("folder selection cancelled", error);
      if (note) note.textContent = "";
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
