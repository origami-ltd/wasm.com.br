import type { MetadataRoute } from "next";

// Under `output: export` Next needs to be told these are static, or it treats the route handlers
// it generates for them as dynamic and refuses to export.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://wasm.com.br/", changeFrequency: "weekly", priority: 1 },
    { url: "https://generals.wasm.com.br/", changeFrequency: "weekly", priority: 0.9 },
    { url: "https://vicecity.wasm.com.br/", changeFrequency: "weekly", priority: 0.9 },
  ];
}
