/**
 * The page every game shell is built from.
 *
 * Both ports had their own copy of this markup and the copies had already drifted — different
 * ids, different controls, and features that only ever landed on one of the two. One builder with
 * named slots keeps them the same page, so a fix to the HUD is a fix to both.
 *
 * Every colour comes from the brand tokens, so `data-brand` on <html> is the only thing that
 * distinguishes the two visually.
 */

export interface ChromeOptions {
  /** Wordmark in the header. */
  title: string;
  /** The line beside it — "WebAssembly + WebGL 2". */
  subtitle: string;
  /** Header links, right-aligned. Raw HTML: each port links somewhere different. */
  links?: string;
  /** Extra HUD controls, inserted before Sound. */
  controls?: string;
  /** Extra absolutely-positioned children of the canvas frame (rings, consoles, overlays). */
  overlays?: string;
}

const COFFEE = `
  <a href="https://buymeacoffee.com/ebellumat" target="_blank" rel="noopener"
     class="ogx-hud-button inline-flex items-center gap-1.5 whitespace-nowrap">☕ Buy me a coffee</a>`;

/** The shelf this page belongs to — every game page links home. */
const HOME = `<a href="https://wasm.com.br" class="ogx-hud-button whitespace-nowrap">wasm.com.br</a>`;

export const defaultLinks = `${COFFEE}${HOME}`;

export function githubLink(repo: string): string {
  return `
    <a href="https://github.com/${repo}" target="_blank" rel="noopener"
       aria-label="Source on GitHub" title="Source on GitHub"
       class="ogx-hud-button ogx-icon-glow grid place-items-center px-2 text-accent">
      <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>
    </a>`;
}

export function render(root: HTMLElement, options: ChromeOptions): void {
  root.className = "flex min-h-svh flex-col";
  root.innerHTML = `
    <header class="ogx-underglow flex min-h-[58px] flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line bg-surface px-3 py-2 sm:px-10">
      <div class="flex items-baseline gap-3">
        <h1 class="ogx-glow m-0 text-[clamp(18px,2.4vw,26px)] uppercase tracking-[0.14em] text-accent">${options.title}</h1>
        <p class="m-0 hidden text-sm text-muted sm:block">${options.subtitle}</p>
      </div>
      <div class="flex items-center gap-2">${options.links ?? defaultLinks}</div>
    </header>

    <main class="flex min-h-0 w-full flex-1 flex-col gap-2.5 px-2 py-2.5 sm:px-6">
      <section class="ogx-panel flex min-h-[52px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2 sm:px-3.5" style="--ogx-panel-surface: var(--surface)">
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-3">
            <span id="status" role="status" aria-live="polite" class="text-sm font-bold">Starting…</span>
            <span id="status-detail" class="truncate text-xs text-muted"></span>
          </div>
          <div id="progress-track" hidden class="mt-1 h-1.5 w-full border border-line/70 bg-black/50 p-px">
            <div id="progress-bar" class="h-full w-0 bg-accent transition-[width] duration-150"></div>
          </div>
        </div>
        <div class="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
          <label class="flex items-center gap-2 text-sm text-muted"><span class="hidden lg:inline">Display</span>
            <select id="aspect" class="ogx-hud-select"><option value="16:9">16:9</option><option value="4:3">4:3</option></select>
          </label>
          ${options.controls ?? ""}
          <button id="sound" class="ogx-hud-button whitespace-nowrap">Sound on</button>
          <button id="fullscreen" class="ogx-hud-button whitespace-nowrap">Fullscreen</button>
          <button id="reset" class="ogx-hud-button whitespace-nowrap" title="Forget the saved install and reload">Reset</button>
        </div>
      </section>

      <div id="stage" class="grid min-h-0 w-full min-w-0 flex-1 place-items-center overflow-hidden">
        <section id="frame" class="ogx-panel relative grid min-w-0 place-items-center p-2" style="--ogx-panel-surface: #000">
          <canvas id="canvas" tabindex="0" class="block border-0 bg-black"></canvas>

          <button id="play" hidden class="absolute inset-0 z-[7] grid place-items-center bg-bg/90 text-accent">
            <span class="ogx-panel px-10 py-5 text-2xl uppercase tracking-[0.2em]"
                  style="--ogx-panel-surface: var(--raised)">Play</span>
          </button>
          ${options.overlays ?? ""}
          <img id="cursor-overlay" alt="" hidden class="pointer-events-none fixed left-0 top-0 z-[5] [image-rendering:pixelated]">
        </section>
      </div>

      <details class="ogx-panel px-3 py-2 text-sm" style="--ogx-panel-surface: var(--surface)">
        <summary class="cursor-pointer text-muted">Runtime log</summary>
        <textarea id="output" readonly aria-label="Runtime log"
                  class="mt-2 h-48 w-full resize-none bg-black p-2 text-xs text-muted"></textarea>
      </details>
    </main>

    <div id="firstrun"></div>`;
}

export const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
