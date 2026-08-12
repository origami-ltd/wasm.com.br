import type { Meta, StoryObj } from "@storybook/react";
import React, { useEffect, useRef } from "react";

import { render, headerLinks } from "../src/chrome";

/**
 * The real page both game ports are built from — this mounts `render()` itself rather than a
 * React copy of its markup.
 *
 * That distinction is the point of the story. The previous version reimplemented the chrome by
 * hand, so it was a third copy that could drift from the two it was supposed to document, and it
 * did: the two pages ended up with different header links and nothing here showed it. Switch the
 * Brand toolbar between "generals" and "vice" to see the same markup re-theme.
 */
const meta: Meta = { title: "Game shell" };
export default meta;

/** Mount the chrome into a real element, the way a game page does. */
function Chrome({ title, subtitle, repo, controls, overlays }: {
  title: string;
  subtitle: string;
  repo?: string;
  controls?: string;
  overlays?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (host.current) render(host.current, { title, subtitle, repo, controls, overlays });
  }, [title, subtitle, repo, controls, overlays]);
  return <div ref={host} />;
}

export const VicePage: StoryObj = {
  name: "Vice City",
  render: () => (
    <Chrome title="Vice City" subtitle="WebAssembly + WebGL 2" repo="origami-ltd/wasm-vice-city" />
  ),
};

export const GeneralsPage: StoryObj = {
  name: "Generals",
  render: () => (
    <Chrome
      title="GeneralsX"
      subtitle="WebAssembly + WebGPU"
      repo="origami-ltd/wasm-generals"
      controls={`
        <label class="flex items-center gap-2 text-sm text-muted"><span class="hidden lg:inline">Boot</span>
          <select id="boot" class="ogx-hud-select">
            <option value="fast">Fast start</option>
            <option value="full">Full start</option>
          </select>
        </label>
        <button id="share" class="ogx-hud-button whitespace-nowrap">Multiplayer</button>`}
    />
  ),
};

/**
 * Both brands at once.
 *
 * A story that renders one brand at a time cannot show a difference *between* them, which is how
 * a missing emoji glyph and a frame pinned to #000 both shipped: each looked fine on its own.
 * These are the same markup twice, differing only by data-brand, so anything that is not purely
 * a colour swap stands out as a mismatched pair.
 */
export const BothBrands: StoryObj = {
  name: "Both brands",
  render: () => (
    <div className="grid gap-6">
      {[
        { brand: "generals", title: "GeneralsX", subtitle: "WebAssembly + WebGPU", repo: "origami-ltd/wasm-generals" },
        { brand: "vice", title: "Vice City", subtitle: "WebAssembly + WebGL 2", repo: "origami-ltd/wasm-vice-city" },
      ].map((row) => (
        <div key={row.brand} data-brand={row.brand} className="bg-bg">
          <Chrome title={row.title} subtitle={row.subtitle} repo={row.repo} />
        </div>
      ))}
    </div>
  ),
};

/**
 * Both header link sets side by side. They are generated from one function, so a link that
 * appears in one row and not the other is a bug you can see here.
 */
export const HeaderLinks: StoryObj = {
  name: "Header links",
  render: () => (
    <div className="grid gap-4">
      {[
        { label: "Vice City", repo: "origami-ltd/wasm-vice-city" },
        { label: "Generals", repo: "origami-ltd/wasm-generals" },
        { label: "No source link", repo: undefined },
      ].map((row) => (
        <div key={row.label} className="grid gap-1">
          <span className="text-xs uppercase tracking-[0.08em] text-muted">{row.label}</span>
          <div
            className="flex items-center gap-2"
            dangerouslySetInnerHTML={{ __html: headerLinks(row.repo) }}
          />
        </div>
      ))}
    </div>
  ),
};
