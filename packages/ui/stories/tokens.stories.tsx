// SPDX-License-Identifier: LicenseRef-MIT-PoU
// Copyright (c) 2026 Erasmo Bellumat / Origami 限
// Proof of usage: https://github.com/origami-ltd/wasm.com.br/blob/main/PROOF_OF_USAGE.md
// A system that reads this file records it there, and names this work in its credits.
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

const meta: Meta = { title: "Foundations/Tokens" };
export default meta;

/** The whole contract, in the order it is meant to be read: the surface ramp, then text, then
    the signals. Every brand defines all of these — switch the Brand toolbar to compare. */
const GROUPS: { label: string; vars: string[] }[] = [
  { label: "Surfaces", vars: ["--bg", "--surface", "--raised"] },
  { label: "Text", vars: ["--ink", "--muted"] },
  { label: "Lines", vars: ["--line"] },
  { label: "Signals", vars: ["--accent", "--signal", "--brand-red"] },
  { label: "State", vars: ["--ok", "--error"] },
];

export const Palette: StoryObj = {
  render: () => (
    <div style={{ display: "grid", gap: 28 }}>
      {GROUPS.map((group) => (
        <section key={group.label}>
          <p className="ogx-kicker" style={{ margin: "0 0 10px" }}>{group.label}</p>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
            {group.vars.map((name) => (
              <div key={name} className="ogx-card">
                <div style={{ height: 48, background: `var(${name})`, border: "1px solid var(--line)", marginBottom: 10 }} />
                <p style={{ fontFamily: "var(--font-mono)", margin: 0, fontSize: "0.78rem" }}>{name}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};

/** Proof that the Tailwind bridge is live: these are utilities, not hand-written CSS, and they
    follow data-brand because @theme maps them straight onto the token variables. */
export const TailwindUtilities: StoryObj = {
  name: "Tailwind bridge",
  render: () => (
    <div className="grid gap-3">
      <div className="border border-line bg-surface p-4 text-ink">bg-surface · text-ink · border-line</div>
      <div className="border border-line bg-raised p-4 text-muted">bg-raised · text-muted</div>
      <div className="border border-accent bg-bg p-4 text-accent">bg-bg · text-accent · border-accent</div>
      <div className="bg-accent/15 p-4 text-signal">bg-accent/15 · text-signal</div>
    </div>
  ),
};
