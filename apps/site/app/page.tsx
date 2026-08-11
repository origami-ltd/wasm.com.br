import { Card, GameBox, OrigamiBrand, TopNav } from "@origami-ltd/ui/react";

const NAV = [
  { label: "About", href: "#about" },
  { label: "Games", href: "#games" },
  { label: "Contact", href: "#contact" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-[1080px] px-6">
      <div className="pt-[22px]">
        <TopNav brand="wasm.com.br" logo="/wasm-logo.svg" links={NAV} />
      </div>

      <header className="pt-[88px] pb-14">
        <p className="ogx-kicker m-0 mb-[18px]">
          A preservation initiative by <OrigamiBrand />
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <img src="/wasm-logo.svg" alt="WebAssembly logo" width={76} height={76} className="block" />
          {/* font-bold explicitly: Tailwind's preflight resets heading weight to inherit. */}
          <h1 className="m-0 text-[clamp(38px,6.4vw,64px)] font-bold leading-[1.06] tracking-[-0.01em]">
            Games that <span className="text-accent">refuse to die</span>
          </h1>
        </div>
        <p className="mt-[26px] max-w-[720px] text-[1.02rem] text-muted">
          When a community reconstructs a game&apos;s source code, that game can outlive the
          platform it was written for. <strong className="text-ink">wasm.com.br</strong> takes games
          that have already been decompiled, or had their source officially released, and compiles
          them to <strong className="text-ink">WebAssembly</strong>, so they run in the browser: no
          installer, no emulator setup, on any operating system.
        </p>
      </header>

      <section id="about" className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5 pb-14">
        <Card title="Preservation">
          Operating systems drop support for old games long before players stop caring. A browser
          build keeps running regardless of graphics APIs or CPU architectures.
        </Card>
        <Card title="Your copy, your files">
          Nothing is redistributed. You point the page at your own installed copy (Steam, GOG, disc)
          and the game streams straight from your disk.
        </Card>
        <Card title="Complete ports">
          Full game logic, WebGPU rendering, audio, and LAN multiplayer between browsers. The entire
          game, exactly as it shipped.
        </Card>
        <Card title="One base, many games">
          The streaming layer, the graphics translation and the browser networking are shared
          infrastructure. Every new port starts from a working foundation.
        </Card>
      </section>

      <section id="games" className="pt-10 pb-[88px] text-center">
        <h2 className="m-0 text-[clamp(24px,3.4vw,34px)] font-bold uppercase tracking-[0.08em]">The shelf</h2>
        <p className="mt-2 mb-14 text-[0.9rem] text-muted">Ported to WebAssembly. Click a box to play.</p>
        <div className="flex flex-wrap justify-center gap-[72px]">
          <GameBox
            href="https://generals.wasm.com.br"
            cover="/box-generals-cover.jpg"
            title="Command & Conquer: Generals Zero Hour"
            back={["WebAssembly + WebGPU", "Streaming assets", "LAN multiplayer"]}
          />
        </div>
      </section>

      <section className="max-w-[760px] border-t border-line py-12">
        <h2 className="ogx-card-title">In the lab</h2>
        <p className="m-0 text-[0.95rem] text-muted">
          <strong className="text-ink">Grand Theft Auto: Vice City</strong> is in port, built on the
          same streaming and rendering base as Generals.{" "}
          <strong className="text-ink">PROTON and WINE have been ported to WebAssembly</strong>,
          which extends the initiative beyond source-available games.{" "}
          <strong className="text-ink">Dino Crisis (GOG)</strong> is already playable through it.
        </p>
      </section>

      <section id="contact" className="max-w-[760px] border-t border-line py-12">
        <h2 className="ogx-card-title">Sponsors &amp; partners</h2>
        <p className="m-0 text-[0.95rem] text-muted">
          To keep doing this at a serious pace, the initiative needs a sponsor or a partnership with
          a company like <strong className="text-ink">Valve</strong> or{" "}
          <strong className="text-ink">GOG</strong>. If that&apos;s you:{" "}
          <a href="mailto:lbj.erasmo@gmail.com">lbj.erasmo@gmail.com</a>
        </p>
        <a className="ogx-button mt-[22px]" href="https://buymeacoffee.com/ebellumat" target="_blank" rel="noopener">
          ☕ Buy me a coffee
        </a>
      </section>

      <footer className="border-t border-line pt-9 pb-[52px] text-[0.8rem] text-muted">
        <p>
          <OrigamiBrand /> ·{" "}
          <a href="https://github.com/origami-ltd/wasm-generals">GitHub</a> · wasm.com.br
        </p>
      </footer>
    </main>
  );
}
