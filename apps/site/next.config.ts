import type { NextConfig } from "next";

// @origami-ltd/ui ships raw .tsx/.css from the workspace — Next has to compile it like app code.
//
// Static export: every route here is already prerendered (there is no server behaviour, no API
// route, nothing dynamic), and exporting makes the site a folder of files that any host can
// serve. It also sidesteps a monorepo problem — a traced Next build looks for node_modules beside
// the app, and npm hoists them to the workspace root, so a prebuilt deploy from apps/site fails
// on a missing @swc/helpers that is really sitting two directories up.
const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@origami-ltd/ui"],
};

export default nextConfig;
