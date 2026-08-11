import type { NextConfig } from "next";

// @origami-ltd/ui ships raw .tsx/.css from the workspace — Next has to compile it like app code.
const nextConfig: NextConfig = { transpilePackages: ["@origami-ltd/ui"] };

export default nextConfig;
