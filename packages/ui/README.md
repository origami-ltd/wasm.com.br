# @origami-ltd/ui

Shared visual language for **origami.ltd**, **wasm.ltd** and the game pages
(**generals.wasm.ltd**, **revc.wasm.ltd**). One variable contract, four
brands: set `data-brand="origami" | "wasm" | "generals" | "vice"` on `<html>`
(plus `data-theme="light"` for origami's yellow mode) and every component follows.

## The contract

Every brand defines the same variables, so a component written once works under
all of them:

| | |
|---|---|
| `--bg` `--surface` `--raised` | page → panel → control, darkest to lightest |
| `--ink` `--muted` | text |
| `--line` | hairlines and borders |
| `--accent` | the brand's primary signal |
| `--signal` | secondary/warm signal |
| `--ok` `--error` | state |
| `--brand-red` | the 限, never brand-dependent |
| `--corner-cut` | the shared clip-path silhouette |
| `--font-body` `--font-mono` | type |

## Consume

CSS-first, so every stack can use it.

**With Tailwind** (the game shells) — `@import "tailwindcss"` must stay in the
app's own CSS file so Tailwind's source detection roots itself in the app:

```css
@import "tailwindcss";
@import "@origami-ltd/ui/theme.css";
```

That publishes the contract as utilities — `bg-surface`, `text-accent`,
`border-line`, `bg-accent/15` — all of which follow `data-brand` at runtime.

**Without Tailwind:**

```ts
import "@origami-ltd/ui/tokens.css";
import "@origami-ltd/ui/components.css";
import { Card, Button, GameBox, OrigamiBrand, TopNav } from "@origami-ltd/ui/react";
```

The React entry is optional sugar; `.ogx-*` classes work in plain markup, which
is how the vanilla-TS game shells use them.

## Components

`.ogx-body` `.ogx-card` `.ogx-button` `.ogx-kicker` `.ogx-origami` `.ogx-topnav`
`.ogx-box-*` (the 3D game box) — the site.

`.ogx-panel` `.ogx-hud-button` `.ogx-hud-select` `.ogx-ring-*` `.ogx-glow`
`.ogx-underglow` `.ogx-icon-glow` `.ogx-scanlines` — the chrome around a running
wasm game.

## Storybook

```bash
npm run storybook   # from the monorepo root — brand switcher in the toolbar
```
