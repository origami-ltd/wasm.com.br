/**
 * The properties in this monorepo, and how to link between them.
 *
 * Every page here links to its siblings — the shelf links to each game, each game links back to
 * the shelf — and those links were written as absolute production URLs. On a staging deploy or on
 * localhost that means every link walks the visitor straight out to production, which makes the
 * environment impossible to review as a whole.
 *
 * So the host decides. A page served from localhost links to the other dev servers; a page served
 * from any *.wasm.ltd host links to the matching subdomain of that same host, so a staging
 * apex keeps you inside staging. Anything else — a Vercel preview URL, where sibling deployments
 * cannot be derived — falls back to production, and can be overridden per environment.
 */

export type SiteKey = "shelf" | "generals" | "vice";

interface SiteDef {
  /** Subdomain under the apex; the shelf is the apex itself. */
  subdomain: string | null;
  /** Where `npm run dev` (or the port script) puts it locally. */
  devPort: number;
  label: string;
}

const APEX = "wasm.ltd";

export const SITES: Record<SiteKey, SiteDef> = {
  shelf: { subdomain: null, devPort: 3210, label: "wasm.ltd" },
  generals: { subdomain: "generals", devPort: 5181, label: "Generals" },
  vice: { subdomain: "revc", devPort: 8100, label: "reVC" },
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);

/** Production, always absolute — this is also what SEO metadata should use. */
export function productionUrl(key: SiteKey): string {
  const { subdomain } = SITES[key];
  return `https://${subdomain ? `${subdomain}.` : ""}${APEX}`;
}

export interface ResolveOptions {
  /** Defaults to the current page's hostname. Pass explicitly when rendering on a server. */
  host?: string;
  /** Set per environment (NEXT_PUBLIC_* / VITE_*) — wins over everything. */
  override?: string;
}

export function siteUrl(key: SiteKey, options: ResolveOptions = {}): string {
  if (options.override) return options.override.replace(/\/$/, "");

  const host = options.host
    ?? (typeof location === "undefined" ? undefined : location.hostname);
  if (!host) return productionUrl(key);

  const { subdomain, devPort } = SITES[key];

  if (LOCAL_HOSTS.has(host)) return `http://localhost:${devPort}`;

  if (host === APEX || host.endsWith(`.${APEX}`)) {
    // Strip the game subdomain, if the current page is one, to get the apex it hangs off. That
    // apex is then whatever environment we are already in, so a staging apex stays in staging.
    const gameSubdomains = Object.values(SITES).map((site) => site.subdomain);
    const first = host.slice(0, host.indexOf("."));
    const apex = gameSubdomains.includes(first) ? host.slice(first.length + 1) : host;
    return `https://${subdomain ? `${subdomain}.` : ""}${apex}`;
  }

  // A Vercel preview host — siblings are not derivable, so production it is.
  return productionUrl(key);
}
