/**
 * Make one directory of the emscripten filesystem durable.
 *
 * Everything else the engines mount is MEMFS and dies with the tab, which is fine for game data
 * the player already has on disk - but not for saves, settings or Options.ini. IDBFS keeps a copy
 * in IndexedDB; this mounts it and pulls back whatever is already there.
 *
 * It exists as one function because the way it fails is browser-specific and both ports have to
 * survive it identically: Safari throws DataCloneError from inside IDBFS (getIDB, getRemoteSet,
 * syncfs) on what emscripten writes, and it surfaces as an unhandled rejection escaping the
 * callback rather than as the `err` argument - so catching the callback is not enough, and the
 * boot took the rejection with it. Losing save persistence is worth far less than losing the
 * game, so a failure here is reported and stepped over.
 */
import type { EmscriptenModule } from "./types";

interface MountableFS {
  mkdirTree(path: string): void;
  mount(fs: unknown, opts: object, path: string): void;
  filesystems: { IDBFS?: unknown };
  syncfs(populate: boolean, cb: (err?: Error) => void): void;
}

/** Resolves once the directory is usable, whether or not it ended up durable. */
export async function mountPersistent(
  instance: EmscriptenModule,
  path: string,
  log: (line: string) => void,
): Promise<void> {
  try {
    const FS = instance.FS as unknown as MountableFS;
    FS.mkdirTree(path);
    if (!FS.filesystems.IDBFS) {
      log(`No IDBFS in this build — ${path} will not survive a reload.`);
      return;
    }
    FS.mount(FS.filesystems.IDBFS, {}, path);

    await new Promise<void>((resolve) => {
      let settled = false;
      const done = (problem?: string): void => {
        if (settled) return;
        settled = true;
        if (problem) log(`Saved data unavailable in this browser (${problem}); it will not persist.`);
        resolve();
      };
      const onRejection = (event: PromiseRejectionEvent): void => done(String(event.reason));
      addEventListener("unhandledrejection", onRejection, { once: true });
      // IDBFS can also simply never call back on a browser it cannot use.
      const timer = setTimeout(() => done("timed out"), 5000);
      try {
        // populate: pull whatever IndexedDB already holds into the in-memory tree.
        FS.syncfs(true, (err) => {
          clearTimeout(timer);
          removeEventListener("unhandledrejection", onRejection);
          done(err?.message);
        });
      } catch (error) {
        done((error as Error).message);
      }
    });
  } catch (error) {
    log(`${path} is not persistent: ${(error as Error).message}`);
  }
}
