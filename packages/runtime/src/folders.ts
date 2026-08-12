/**
 * Remembering which folders the player pointed us at.
 *
 * The File System Access handles survive reloads in IndexedDB, but the permission does not always:
 * the browser may demand a fresh gesture on a later load, which is why `hasAny()` exists separately
 * from `load()` — handles present but unreadable means "ask again", not "never chosen".
 */

const STORE = "handles";

/** queryPermission/requestPermission are shipped by Chromium but absent from lib.dom. */
type PermissionedHandle = FileSystemDirectoryHandle & {
  queryPermission?: (descriptor: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: "read" | "readwrite" }) => Promise<PermissionState>;
};

export class FolderStore {
  private readonly dbName: string;

  /** @param dbName one database per game, so clearing one never touches the other. */
  constructor(dbName: string) {
    this.dbName = dbName;
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async save(handles: Map<string, FileSystemDirectoryHandle>): Promise<void> {
    const database = await this.open();
    const store = database.transaction(STORE, "readwrite").objectStore(STORE);
    for (const [key, handle] of handles) store.put(handle, key);
  }

  /**
   * The saved handles for `keys`, with read permission granted.
   *
   * Returns an empty map if the player declines — the caller falls back to the server. Keys with
   * nothing saved are simply absent.
   */
  async load(
    keys: readonly string[],
    options: { request?: boolean } = {},
  ): Promise<Map<string, FileSystemDirectoryHandle>> {
    const database = await this.open();
    // Every read must be issued before the first await: an IDB transaction closes as soon as the
    // event loop yields, so a second get() after awaiting would throw "transaction has finished".
    const store = database.transaction(STORE, "readonly").objectStore(STORE);
    const pending = new Map(keys.map((key) => [
      key,
      new Promise<FileSystemDirectoryHandle | undefined>((resolve) => {
        const get = store.get(key);
        get.onsuccess = () => resolve(get.result as FileSystemDirectoryHandle | undefined);
        get.onerror = () => resolve(undefined);
      }),
    ]));

    const found = new Map<string, FileSystemDirectoryHandle>();
    for (const [key, request] of pending) {
      const directory = (await request) as PermissionedHandle | undefined;
      if (!directory) continue;
      // requestPermission needs a user gesture, and a page load does not have one — asking there
      // fails every time, which is why a saved folder had to be re-picked on every visit. So it is
      // only asked for when the caller says a gesture is in hand (the gate's own click handler).
      if ((await directory.queryPermission?.({ mode: "read" })) !== "granted"
          && (!options.request
              || (await directory.requestPermission?.({ mode: "read" })) !== "granted")) {
        return new Map(); // declined: treat the whole install as unavailable, not half of it
      }
      found.set(key, directory);
    }
    return found;
  }

  /** True when the player already picked folders, even if this load cannot read them yet. */
  async hasAny(): Promise<boolean> {
    try {
      const database = await this.open();
      return await new Promise<boolean>((resolve) => {
        const request = database.transaction(STORE, "readonly").objectStore(STORE).count();
        request.onsuccess = () => resolve(request.result > 0);
        request.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /** Forget the picked install. Paired with localStorage.clear() by the shells' Reset button. */
  clear(): void {
    indexedDB.deleteDatabase(this.dbName);
  }
}
