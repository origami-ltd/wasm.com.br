export default function Home() {
  return (
    <main>
      <header className="hero">
        <p className="kicker">A preservation initiative by Origami LTD (限)</p>
        <h1>
          Games that <span className="accent">refuse to die</span>
        </h1>
        <p className="lede">
          When a community reconstructs a game&apos;s source code, that game has earned something
          better than a compatibility layer and a prayer. <strong>wasm.com.br</strong> takes games
          that have already been decompiled — or had their source officially released — and compiles
          them to <strong>WebAssembly</strong>, so they run in the one place that needs no
          installer, no emulator setup and no operating system loyalty: the browser.
        </p>
      </header>

      <section className="why">
        <div className="card">
          <h2>Preservation</h2>
          <p>
            Operating systems abandon games faster than players do. A browser build cannot be
            orphaned by a DirectX version or a 32-bit purge — it just keeps running.
          </p>
        </div>
        <div className="card">
          <h2>Your copy, your files</h2>
          <p>
            Nothing is redistributed. You point the page at your own installed copy — Steam, GOG,
            disc — and the game streams straight from your disk. Ownership stays exactly where it is.
          </p>
        </div>
        <div className="card">
          <h2>The whole game</h2>
          <p>
            Not a demo, not a viewer. Full game logic, WebGPU rendering, audio, and LAN multiplayer
            — browser to browser, like it&apos;s 2003 again.
          </p>
        </div>
      </section>

      <section className="shelf">
        <h2 className="shelf-title">The shelf</h2>
        <p className="shelf-sub">Ported to WebAssembly. Click a box to play.</p>
        <div className="shelf-row">
          <a className="box-scene" href="https://generals.wasm.com.br" aria-label="Play Command & Conquer: Generals Zero Hour in your browser">
            <div className="box">
              <div className="box-face box-front">
                <img src="/box-generals.png" alt="Command & Conquer: Generals Zero Hour running in the browser" />
                <span className="box-label">
                  <em>Command &amp; Conquer</em>
                  Generals — Zero Hour
                </span>
              </div>
              <div className="box-face box-back">
                <span>WebAssembly + WebGPU</span>
                <span>Streaming assets</span>
                <span>LAN multiplayer</span>
                <span className="play">PLAY ▸</span>
              </div>
              <div className="box-face box-spine">GENERALS — ZERO HOUR</div>
              <div className="box-face box-spine box-spine-right">WASM.COM.BR</div>
              <div className="box-face box-top" />
              <div className="box-face box-bottom" />
            </div>
            <div className="box-shadow" />
          </a>
        </div>
      </section>

      <section className="lab">
        <h2>In the lab</h2>
        <p>
          <strong>PROTON + WINE have been ported to WebAssembly</strong>, extending the initiative
          beyond source-available games — <strong>Dino Crisis (GOG) is already playable</strong>{" "}
          through it. The shelf above is about to get crowded.
        </p>
      </section>

      <section className="sponsor">
        <h2>Sponsors &amp; partners</h2>
        <p>
          This work needs a patron with skin in the game — a company like <strong>Valve</strong> or{" "}
          <strong>GOG</strong>, whose catalogs are full of titles that deserve this treatment. If
          that&apos;s you: <a href="mailto:lbj.erasmo@gmail.com">lbj.erasmo@gmail.com</a>
        </p>
        <a className="coffee" href="https://buymeacoffee.com/ebellumat" target="_blank" rel="noopener">
          ☕ Buy me a coffee
        </a>
      </section>

      <footer>
        <p>
          <a href="https://origami.ltd">Origami LTD</a> <span className="kanji">限</span> ·{" "}
          <a href="https://github.com/origami-ltd/wasm-generals">GitHub</a> · wasm.com.br
        </p>
      </footer>
    </main>
  );
}
