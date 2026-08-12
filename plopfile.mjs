/**
 * Scaffolding for the wasm.ltd ports.
 *
 * Every port is the same shape — an upstream decompilation, an Emscripten build, the shared page
 * from packages/shell, and a subdomain on wasm.ltd — so the things that describe a port should
 * be generated from that shape rather than written from scratch and then drifting.
 *
 *   npx plop port-readme
 *
 * It writes the README, the licence with its proof-of-usage condition, the record file that
 * condition points at, the workflow that validates a recorded row, and the page's SEO and
 * agent-facing surface: title and metadata under the port's own name, JSON-LD with usageInfo,
 * llms.txt, robots.txt and a sitemap.
 */

export default function plop(plop) {
  plop.setHelper("upper", (text) => String(text).toUpperCase());
  // A colour goes into an SVG data: URI, where "#" ends the URI unless it is encoded.
  plop.setHelper("themeColorEncoded", (text) => String(text).replace("#", "%23"));
  // Handlebars escapes by default; READMEs are plain text and the escaping mangles apostrophes.
  // shields.io needs its label URL-encoded, or "WebGL 2" breaks the badge.
  plop.setHelper("encodeBadge", (text) => String(text).replace(/ /g, "%20").replace(/-/g, "--"));

  plop.setGenerator("port-readme", {
    description: "A port's paperwork: README, licence, usage record, and the agent-facing page surface",
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
        message: "Full port name, e.g. reVC",
        validate: (value) => (value ? true : "required"),
      },
      {
        type: "input",
        name: "title",
        message: "Page wordmark, e.g. reVC",
      },
      {
        type: "input",
        name: "subdomain",
        message: "Subdomain on wasm.ltd, e.g. revc",
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
        message: "What the player must own, e.g. an installed copy of the game",
      },
      {
        type: "input",
        name: "brand",
        message: "data-brand for the page's token set, e.g. vice",
        validate: (value) => (value ? true : "required"),
      },
      {
        type: "input",
        name: "themeColor",
        message: "Page theme colour, e.g. #110514",
        default: "#0b0b10",
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
        path: "games/{{slug}}/PROOF_OF_USAGE.md",
        templateFile: "templates/PROOF_OF_USAGE.md.hbs",
        force: true,
      },
      {
        type: "add",
        path: "games/{{slug}}/LICENSE",
        templateFile: "templates/LICENSE-{{license}}.hbs",
        force: true,
        skip: (answers) => (answers.license === "MIT" ? false : "GPL text is not generated"),
      },
      // The workflow that checks a recorded row against its own handshake hash. Shipped with the
      // port because a licence that names a validation nobody runs is a licence nobody keeps.
      {
        type: "add",
        path: "games/{{slug}}/.github/workflows/validate-proof-of-usage.yml",
        templateFile: "templates/validate-proof-of-usage.yml.hbs",
        force: true,
      },
      // Everything an automated reader sees. The page's own metadata, the file it is pointed at,
      // and the two files a crawler looks for before anything else.
      {
        type: "add",
        path: "games/{{slug}}/web/index.html",
        templateFile: "templates/index.html.hbs",
        force: true,
      },
      {
        type: "add",
        path: "games/{{slug}}/web/public/llms.txt",
        templateFile: "templates/llms.txt.hbs",
        force: true,
      },
      {
        type: "add",
        path: "games/{{slug}}/web/public/robots.txt",
        templateFile: "templates/robots.txt.hbs",
        force: true,
      },
      {
        type: "add",
        path: "games/{{slug}}/web/public/sitemap.xml",
        templateFile: "templates/sitemap.xml.hbs",
        force: true,
      },
    ],
  });
}
