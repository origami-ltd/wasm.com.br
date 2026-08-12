/**
 * Everything between the engine's framebuffer and the player: canvas fit, fullscreen, pointer
 * capture and sound.
 *
 * Both ports arrived at the same answers by different routes, and each was missing something the
 * other had — Generals drew a cursor overlay but Vice did the ESC synthesis, and only one of them
 * survived a hidden tab. This is the union.
 */

import { el } from "@origami-ltd/ui/chrome";

/**
 * Scale the canvas to fit its stage, letterboxed.
 *
 * JS owns the fit because the engine owns the backing size, and a CSS max-% cannot contain a
 * canvas whose width attribute changes underneath it. Windowed is capped at 1 so the picture is
 * never a blurry upscale; fullscreen is allowed past it, which is the whole point of fullscreen.
 */
export function mountDisplay(): { fit: () => void } {
  const canvas = el<HTMLCanvasElement>("canvas");
  const frame = el("frame");
  const stage = el("stage");

  const fit = (): void => {
    const fullscreen = document.fullscreenElement === frame;
    // Cap by the viewport as well: during layout a grid track can report more than the window.
    const availableWidth = Math.min(fullscreen ? innerWidth : stage.clientWidth, innerWidth) - 16;
    const availableHeight = Math.min(fullscreen ? innerHeight : stage.clientHeight, innerHeight) - 16;
    const raw = Math.min(
      availableWidth / (canvas.width || 1),
      availableHeight / (canvas.height || 1),
    );
    const scale = fullscreen ? raw : Math.min(1, raw);
    canvas.style.width = `${Math.max(1, Math.floor((canvas.width || 1) * scale))}px`;
    canvas.style.height = `${Math.max(1, Math.floor((canvas.height || 1) * scale))}px`;
  };

  new ResizeObserver(fit).observe(stage);
  // The engine resizes its own canvas; nothing else tells us when.
  new MutationObserver(fit).observe(canvas, { attributes: true, attributeFilter: ["width", "height"] });
  addEventListener("resize", fit);
  document.addEventListener("fullscreenchange", fit);

  // Fullscreen the frame rather than the canvas, so overlays drawn on top stay in the
  // fullscreened subtree. webkitRequestFullscreen is the iPad path: WebKit only shipped the
  // standard name recently and iPhone has no element fullscreen at all.
  el("fullscreen").addEventListener("click", () => {
    const target = frame as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    void (target.requestFullscreen?.() ?? target.webkitRequestFullscreen?.())?.catch(() => {});
  });

  fit();
  return { fit };
}

export interface PointerOptions {
  /** True while the game wants the pointer captured — gameplay, not menus. */
  wantsCapture: () => boolean;
  /** False until the engine can take input. */
  ready: () => boolean;
  /** Where the engine thinks its cursor is, for the drawn overlay. Omit to skip the overlay. */
  cursor?: () => { x: number; y: number } | undefined;
}

/**
 * Pointer capture for the canvas.
 *
 * Two things make this more than requestPointerLock. The browser eats ESC as the pointer-lock
 * exit, so the engine never sees the key — but a lock lost while the page still has focus IS an
 * ESC press, so it gets synthesised for the game's own pause menu. And where the engine draws its
 * own cursor, that cursor has to be mirrored into a DOM element: under lock the OS pointer is
 * hidden, so the engine's idea of where it is becomes the only thing the player can see.
 */
export function mountPointer(options: PointerOptions): void {
  const canvas = el<HTMLCanvasElement>("canvas");
  const overlay = el<HTMLImageElement>("cursor-overlay");
  let overlaySource = "";

  const draw = (): void => {
    if (document.pointerLockElement !== canvas) return;
    const at = options.cursor?.();
    const match = /url\(\s*"?([^")]+)"?\s*\)(?:\s+(\d+)\s+(\d+))?/.exec(canvas.style.cursor);
    if (at && match && at.x >= 0 && at.y >= 0) {
      const [, url, hotX = "0", hotY = "0"] = match;
      if (url !== overlaySource) {
        overlaySource = url as string;
        overlay.src = url as string;
      }
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / (canvas.width || 1);
      const scaleY = rect.height / (canvas.height || 1);
      overlay.hidden = false;
      overlay.style.transform =
        `translate(${rect.left + at.x * scaleX - Number(hotX)}px, ${rect.top + at.y * scaleY - Number(hotY)}px)`;
    } else {
      overlay.hidden = true;
    }
    requestAnimationFrame(draw);
  };

  document.addEventListener("pointerlockchange", () => {
    const locked = document.pointerLockElement === canvas;
    canvas.classList.toggle("ogx-pointer-locked", locked);
    if (locked && options.cursor) draw();
    else overlay.hidden = true;

    // An unlock from alt-tab or a blur is not an ESC — hasFocus tells them apart.
    if (!locked && document.hasFocus() && !document.hidden && options.ready()) {
      for (const type of ["keydown", "keyup"] as const) {
        canvas.dispatchEvent(new KeyboardEvent(type, { key: "Escape", code: "Escape", bubbles: true }));
      }
    }
  });

  const capture = (): void => {
    if (document.pointerLockElement || !options.ready() || !options.wantsCapture()) return;
    // requestPointerLock rejects rather than throws, and it legitimately fails in an unfocused or
    // embedded document. Unhandled, that noise drowns the runtime log, and the game is still
    // playable without capture. Older browsers throw synchronously instead.
    try {
      void (canvas.requestPointerLock() as unknown as Promise<void> | undefined)?.catch(() => {});
    } catch {
      /* ignored */
    }
  };

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("pointerdown", () => {
    canvas.focus();
    capture();
  });

  // Follow the game in and out of the state that wants capture, rather than waiting for a stray
  // click: entering gameplay should grab the pointer, and returning to a menu should release it.
  // The Play click already supplied the activation the browser asks for.
  let wanted = options.wantsCapture();
  setInterval(() => {
    const wants = options.wantsCapture();
    if (wants && !wanted) capture();
    if (!wants && document.pointerLockElement === canvas) document.exitPointerLock?.();
    wanted = wants;
  }, 400);
}

export interface SoundOptions {
  /** localStorage prefix, so the two pages do not share a preference. */
  key: string;
  /** Tell the engine. Called on every change and once the module exists. */
  apply: (muted: boolean) => void;
}

export interface Sound {
  readonly muted: boolean;
  set(muted: boolean): void;
  /** Re-apply to a module that has just come up. */
  sync(): void;
}

export function mountSound(options: SoundOptions): Sound {
  const button = el("sound");
  const storageKey = `${options.key}.soundMuted`;
  let muted = localStorage.getItem(storageKey) === "1";

  const set = (next: boolean): void => {
    muted = next;
    localStorage.setItem(storageKey, next ? "1" : "0");
    options.apply(next);
    button.textContent = next ? "Sound off" : "Sound on";
  };

  button.addEventListener("click", () => set(!muted));
  button.textContent = muted ? "Sound off" : "Sound on";

  return {
    get muted() {
      return muted;
    },
    set,
    sync: () => options.apply(muted),
  };
}

/**
 * Resume every AudioContext the page creates.
 *
 * Autoplay policy suspends contexts built before a gesture, and an engine that made one at
 * startup has no idea it needs resuming — it just plays into a suspended context and is silent.
 * Patching the constructor catches the ones the engine makes for itself, which is all of them.
 */
export function unlockAudio(log?: (line: string) => void): void {
  const contexts: AudioContext[] = [];
  const Original = window.AudioContext
    ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Original) return;

  class Patched extends Original {
    constructor(...args: ConstructorParameters<typeof AudioContext>) {
      super(...args);
      contexts.push(this);
    }
  }
  window.AudioContext = Patched as unknown as typeof AudioContext;
  (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext =
    Patched as unknown as typeof AudioContext;

  const resume = (): void => {
    for (const context of contexts) {
      if (context.state === "suspended") {
        void context.resume().then(() => log?.(`[audio] resumed (${context.state})`)).catch(() => {});
      }
    }
  };

  for (const type of ["pointerdown", "keydown", "touchend"] as const) {
    addEventListener(type, resume, { passive: true });
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) resume();
  });
}
