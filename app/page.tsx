import { GameBox } from "./game-box";

export default function Home() {
  return (
    <main>
      <nav className="topnav">
        <a className="brand" href="/">
          <img src="/wasm-logo.svg" alt="" width={22} height={22} />
          wasm.com.br
        </a>
        <div className="topnav-links">
          <a href="#about">About</a>
          <a href="#games">Games</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      <header className="hero">
        <p className="kicker">
          A preservation initiative by <a className="origami-link" href="https://origami.ltd">Origami <span className="kanji">限</span></a>
        </p>
        <div className="hero-mark">
          <img src="/wasm-logo.svg" alt="WebAssembly logo" width={76} height={76} />
          <h1>
            Games that <span className="accent">refuse to die</span>
          </h1>
        </div>
        <p className="lede">
          When a community reconstructs a game&apos;s source code, that game can outlive the
          platform it was written for. <strong>wasm.com.br</strong> takes games that have already
          been decompiled, or had their source officially released, and compiles them to{" "}
          <strong>WebAssembly</strong>, so they run in the browser: no installer, no emulator
          setup, on any operating system.
        </p>
      </header>

      <section className="why" id="about">
        <div className="card">
          <h2>Preservation</h2>
          <p>
            Operating systems drop support for old games long before players stop caring. A
            browser build keeps running regardless of graphics APIs or CPU architectures.
          </p>
        </div>
        <div className="card">
          <h2>Your copy, your files</h2>
          <p>
            Nothing is redistributed. You point the page at your own installed copy (Steam, GOG,
            disc) and the game streams straight from your disk.
          </p>
        </div>
        <div className="card">
          <h2>Complete ports</h2>
          <p>
            Full game logic, WebGPU rendering, audio, and LAN multiplayer between browsers. The
            entire game, exactly as it shipped.
          </p>
        </div>
        <div className="card">
          <h2>One base, many games</h2>
          <p>
            The streaming layer, the graphics translation and the browser networking are shared
            infrastructure. Every new port starts from a working foundation.
          </p>
        </div>
      </section>

      <section className="shelf" id="games">
        <h2 className="shelf-title">The shelf</h2>
        <p className="shelf-sub">Ported to WebAssembly. Click a box to play.</p>
        <div className="shelf-row">
          <GameBox
            href="https://generals.wasm.com.br"
            cover="/box-generals-cover.jpg"
            title="Command & Conquer: Generals Zero Hour"
            back={["WebAssembly + WebGPU", "Streaming assets", "LAN multiplayer"]}
          />
        </div>
      </section>

      <section className="lab">
        <h2>In the lab</h2>
        <p>
          <strong>PROTON and WINE have been ported to WebAssembly</strong>, which extends the
          initiative beyond source-available games. <strong>Dino Crisis (GOG)</strong> is already
          playable through it.
        </p>
      </section>

      <section className="sponsor" id="contact">
        <h2>Sponsors &amp; partners</h2>
        <p>
          To keep doing this at a serious pace, the initiative needs a sponsor or a partnership
          with a company like <strong>Valve</strong> or <strong>GOG</strong>. If that&apos;s you:{" "}
          <a href="mailto:lbj.erasmo@gmail.com">lbj.erasmo@gmail.com</a>
        </p>
        <a className="coffee" href="https://buymeacoffee.com/ebellumat" target="_blank" rel="noopener">
          ☕ BUY ME A COFFEE
        </a>
      </section>

      <footer>
        <p>
          <a className="origami-link" href="https://origami.ltd">Origami <span className="kanji">限</span></a> ·{" "}
          <a href="https://github.com/origami-ltd/wasm-generals">GitHub</a> · wasm.com.br
        </p>
      </footer>
    </main>
  );
}
