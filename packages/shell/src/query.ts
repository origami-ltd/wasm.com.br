/**
 * The query parameters every game page understands.
 *
 * They had drifted into two different vocabularies — one page needed `?install=server` to notice
 * an install the host was already offering, the other found it by itself and had no such flag —
 * so a link that worked on one page did nothing on the other. Declaring them here means both
 * pages answer to the same things, and a new port gets them for free.
 *
 * Anything genuinely specific to one engine (LAN client ids, engine argv) stays in that port.
 */

const params = new URLSearchParams(typeof location === "undefined" ? "" : location.search);

export const query = {
  /**
   * Open the install picker straight away.
   *
   * How a player repoints the page at a different copy of the game without clearing everything.
   */
  get pickInstall(): boolean {
    return params.get("assets") === "1";
  },

  /**
   * Boot with an empty game directory.
   *
   * The engine cannot get far without assets, but it proves the wasm module, the windowing, the
   * GPU path and the yield all come up — the only thing testable before an install exists.
   */
  get engineOnly(): boolean {
    return params.get("engine") === "1";
  },

  /** Start muted, whatever the saved preference says. */
  get muted(): boolean {
    return params.get("sound") === "0";
  },

  /**
   * Ignore an install the host is offering and use the picked folder instead.
   *
   * The host manifest is found automatically now, so this is the escape hatch rather than the
   * opt-in it used to be — it is how you test the folder-picking path on a host that also serves
   * a copy.
   */
  get ignoreHostInstall(): boolean {
    return params.get("install") === "folder";
  },

  /** Read anything a single port defines for itself. */
  get(name: string): string | null {
    return params.get(name);
  },
};

/**
 * Is the host serving an install of its own?
 *
 * Both dev hosts publish a manifest endpoint; a static host does not. Probing it is what removes
 * the need for a flag: the page asks, and uses the answer if there is one.
 */
export async function hostInstall<T>(
  url: string,
  read: () => Promise<T>,
  log?: (line: string) => void,
): Promise<T | undefined> {
  if (query.ignoreHostInstall) return undefined;
  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) return undefined;
    return await read();
  } catch (error) {
    log?.(`No host-served install at ${url} (${(error as Error).message}).`);
    return undefined;
  }
}
