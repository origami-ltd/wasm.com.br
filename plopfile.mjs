/**
 * Scaffolding for the wasm.com.br ports.
 *
 * Every port is the same shape — an upstream decompilation, an Emscripten build, the shared page
 * from packages/shell, and a subdomain on wasm.com.br — so the things that describe a port should
 * be generated from that shape rather than written from scratch and then drifting.
 *
 *   npx plop port-readme
 */

export default function plop(plop) {
  plop.setHelper("upper", (text) => String(text).toUpperCase());
  // Handlebars escapes by default; READMEs are plain text and the escaping mangles apostrophes.
  // shields.io needs its label URL-encoded, or "WebGL 2" breaks the badge.
  plop.setHelper("encodeBadge", (text) => String(text).replace(/ /g, "%20").replace(/-/g, "--"));

  plop.setGenerator("port-readme", {
    description: "README for a game port, in the house style",
    prompts: [
      {
        type: "input",
        name: "slug",
        message: "Repository name (origami-ltd/<slug>), e.g. wasm-vice-city",
        validate: (value) => (value ? true : "required"),
      },
      {
        type: "input",
        name: "game",
        message: "Full game name, e.g. Grand Theft Auto: Vice City",
        validate: (value) => (value ? true : "required"),
      },
      {
        type: "input",
        name: "title",
        message: "Page wordmark, e.g. Vice City",
      },
      {
        type: "input",
        name: "subdomain",
        message: "Subdomain on wasm.com.br, e.g. vicecity",
        validate: (value) => (value ? true : "required"),
      },
      {
        type: "list",
        name: "gpu",
        message: "Renderer",
        choices: ["WebGL 2", "WebGPU"],
      },
      {
        type: "input",
        name: "upstreamName",
        message: "Upstream project this port is based on, e.g. reVC",
        validate: (value) => (value ? true : "required"),
      },
      {
        type: "input",
        name: "upstreamUrl",
        message: "Upstream URL, e.g. https://github.com/mrxenginner/reVC",
        validate: (value) => (value ? true : "required"),
      },
      {
        type: "input",
        name: "upstreamNote",
        message: "Upstream's own licensing wording, quoted verbatim in the README (optional)",
      },
      {
        type: "list",
        name: "license",
        message: "Licence for our portion",
        // MIT unless an upstream forces otherwise — see the note in the template.
        choices: ["MIT", "GPL-3.0"],
      },
      {
        type: "input",
        name: "workspace",
        message: "npm workspace name, e.g. @wasm/vice-web",
        validate: (value) => (value ? true : "required"),
      },
      {
        type: "input",
        name: "target",
        message: "Emscripten output basename, e.g. reVC",
      },
      {
        type: "input",
        name: "buildCommand",
        message: "One-line build command, e.g. ./scripts/build-web.sh",
      },
      {
        type: "input",
        name: "serveCommand",
        message: "One-line local serve command",
      },
      {
        type: "input",
        name: "installHint",
        message: "What the player must own, e.g. an installed copy of GTA: Vice City",
      },
    ],
    actions: [
      {
        type: "add",
        path: "games/{{slug}}/README.md",
        templateFile: "templates/port-readme.md.hbs",
        force: true,
      },
      {
        type: "add",
        path: "games/{{slug}}/LICENSE",
        templateFile: "templates/LICENSE-{{license}}.hbs",
        force: true,
        skip: (answers) => (answers.license === "MIT" ? false : "GPL text is not generated"),
      },
    ],
  });
}
