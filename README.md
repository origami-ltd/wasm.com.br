# wasm.com.br

Games that refuse to die. A preservation and portability initiative: games that have
already been decompiled, or had their source officially released, compiled to
WebAssembly and running in the browser — streaming from the player's own installed
copy, so nothing is redistributed.

This is the monorepo for the whole initiative: the landing site, the shared design
system and browser runtime, and each game port as a submodule.

## Layout

```
apps/site               wasm.com.br — Next.js, deployed on Vercel
packages/ui             @origami-ltd/ui — tokens, components, Storybook (4 brands)
packages/runtime        @wasm/runtime — archive streaming, picked-folder persistence
games/wasm-generals     submodule — Command & Conquer: Generals Zero Hour  (public)
games/wasm-vice-city    submodule — Grand Theft Auto: Vice City            (private)
```

Every game page is the same page: the same design tokens, the same corner-cut chrome,
the same SharedArrayBuffer streaming layer. A port supplies its engine and its rules
for recognising an install; everything else is shared.

## Getting started

```bash
git clone --recurse-submodules https://github.com/origami-ltd/wasm.com.br.git
```

`games/wasm-vice-city` is private — clones without access to it will skip that
submodule, and everything else still builds.

```bash
npm install
```

| command | what it runs |
|---|---|
| `npm run dev` | the landing site |
| `npm run dev:generals` | the Generals shell |
| `npm run dev:vice` | the Vice City shell |
| `npm run storybook` | the design system, with a brand switcher |
| `npm test --workspace @wasm/runtime` | the archive-cache tests |

The web shells are npm workspaces, so they are built from this repo, not from inside
the game submodule — that is what resolves `@origami-ltd/ui` and `@wasm/runtime`. The
engine itself (CMake + emscripten) is built inside the submodule, as documented there.

A game shell needs its engine bundle (`/GeneralsXZH.js`, `/reVC.js`) served beside it.
Without one, the Vice City shell still runs so the install picker can be used; the
Generals shell needs a production build (`npm run build --workspace @wasm/generals-web`)
because its engine import is only externalised at build time.

## Status

- **Generals Zero Hour** — playable at [generals.wasm.com.br](https://generals.wasm.com.br).
  WebGPU rendering, streaming assets, LAN multiplayer between browsers.
- **Vice City** — the [reVC](https://github.com/mrxenginner/reVC) decompilation. The page,
  the install gate and the streaming layer are in place; the emscripten build of the engine
  is the next step.
- **PROTON/WINE on WebAssembly** — extends the initiative beyond source-available games.

Sponsorship or a partnership: lbj.erasmo@gmail.com
