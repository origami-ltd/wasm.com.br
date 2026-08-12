/**
 * The query parameters every game page understands.
 *
 * They had drifted into two vocabularies, so a link that worked on one page did nothing on the
 * other. Declaring them here means both pages answer to the same things, and a new port gets
 * them for free.
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

  /** Read anything a single port defines for itself. */
  get(name: string): string | null {
    return params.get(name);
  },
};

/**
 * Is the host serving an install of its own?
 *
 * Both dev hosts publish a manifest endpoint; a static host does not. The page asks and uses the
 * answer if there is one — which is why finding an install needs no flag, and never did.
 */
export async function hostInstall<T>(
  url: string,
  read: () => Promise<T>,
  log?: (line: string) => void,
): Promise<T | undefined> {
  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) return undefined;
    return await read();
  } catch (error) {
    log?.(`No host-served install at ${url} (${(error as Error).message}).`);
    return undefined;
  }
}
