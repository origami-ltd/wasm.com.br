import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

/** The chrome that wraps a running wasm game. Both ports use exactly these classes — switch the
    Brand toolbar between "generals" and "vice" to see the same markup re-theme. */
const meta: Meta = { title: "Game shell" };
export default meta;

export const ControlStrip: StoryObj = {
  name: "Control strip",
  render: () => (
    <section
      className="ogx-panel flex min-h-[52px] flex-wrap items-center justify-between gap-2 px-3.5 py-2"
      style={{ "--ogx-panel-surface": "var(--surface)" } as React.CSSProperties}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-bold">Downloading</span>
          <span className="truncate text-xs text-muted">AudioZH.big · 412/2130 MB</span>
        </div>
        <div className="mt-1 h-1.5 w-full border border-line/70 bg-black/50 p-px">
          <div className="h-full w-[42%] bg-accent" />
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
        <label className="flex items-center gap-2 text-sm text-muted">
          Display
          <select className="ogx-hud-select" defaultValue="16:9">
            <option>16:9</option>
            <option>4:3</option>
          </select>
        </label>
        <button className="ogx-hud-button whitespace-nowrap">Sound on</button>
        <button className="ogx-hud-button whitespace-nowrap">Fullscreen</button>
        <button className="ogx-hud-button whitespace-nowrap">Reset</button>
      </div>
    </section>
  ),
};

export const Header: StoryObj = {
  render: () => (
    <header className="ogx-underglow flex min-h-[58px] flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line bg-surface px-3 py-2 sm:px-10">
      <div className="flex items-baseline gap-3">
        <h1 className="ogx-glow m-0 text-[clamp(18px,2.4vw,26px)] uppercase tracking-[0.14em] text-accent">
          GeneralsX
        </h1>
        <p className="m-0 text-sm text-muted">WebAssembly + WebGPU</p>
      </div>
      <a className="ogx-hud-button inline-flex items-center gap-1.5" href="#">
        ☕ Buy me a coffee
      </a>
    </header>
  ),
};

export const StatusChips: StoryObj = {
  name: "Capability chips",
  render: () => (
    <div className="flex flex-wrap gap-2">
      <span className="border-l-[3px] border-signal bg-raised px-2 py-1 text-xs text-signal">WASM missing</span>
      <span className="border-l-[3px] border-signal bg-raised px-2 py-1 text-xs text-signal">WebGPU missing</span>
      <span className="border-l-[3px] border-ok bg-raised px-2 py-1 text-xs text-ok">Streaming</span>
      <span className="border-l-[3px] border-error bg-raised px-2 py-1 text-xs text-error">Archive fetch failed</span>
    </div>
  ),
};

export const ProgressRing: StoryObj = {
  name: "Download ring",
  render: () => (
    <div className="grid justify-items-center gap-4">
      <div className="ogx-ring-wrap">
        <svg className="ogx-ring" viewBox="0 0 120 120" aria-hidden="true">
          <circle className="ogx-ring-track" cx="60" cy="60" r="54" />
          {/* 339.292 is the full circumference; the offset is what animates. */}
          <circle className="ogx-ring-fill" cx="60" cy="60" r="54" style={{ strokeDashoffset: 339.292 * 0.32 }} />
        </svg>
        <div className="ogx-ring-center">
          <div className="ogx-ring-percent">68%</div>
          <div className="ogx-ring-note mt-1">1448/2130 MB</div>
        </div>
      </div>
      <div className="ogx-ring-file">AudioZH.big</div>
    </div>
  ),
};

export const FirstRunGate: StoryObj = {
  name: "First-run gate",
  render: () => (
    <div className="grid place-items-center bg-bg/94 p-4">
      <div
        className="ogx-panel max-w-4xl p-4 text-left sm:p-7"
        style={{ "--ogx-panel-surface": "var(--raised)" } as React.CSSProperties}
      >
        <h2 className="ogx-glow m-0 mb-2 uppercase tracking-[0.12em] text-accent">Load your game files</h2>
        <p className="mb-5 text-[13px] text-muted">
          This page runs your own copy. Nothing is downloaded and nothing is redistributed.
        </p>
        <div className="border border-line bg-surface p-4">
          <h3 className="m-0 mb-2 flex items-center gap-2 text-sm uppercase tracking-[0.08em] text-accent">
            Select your game folder
            <button className="ogx-hud-button h-5 min-h-5 w-5 rounded-full px-0 text-xs [clip-path:none]">i</button>
          </h3>
          <p className="text-[13px] text-muted">Point the browser at your installed copy.</p>
          <button className="ogx-hud-button mt-2">Select game folder</button>
        </div>
      </div>
    </div>
  ),
};
