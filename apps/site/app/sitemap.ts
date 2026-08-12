import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://wasm.com.br/", changeFrequency: "weekly", priority: 1 },
    { url: "https://generals.wasm.com.br/", changeFrequency: "weekly", priority: 0.9 },
    { url: "https://vicecity.wasm.com.br/", changeFrequency: "weekly", priority: 0.9 },
  ];
}
