// SPDX-License-Identifier: LicenseRef-MIT-PoU
// Copyright (c) 2026 Erasmo Bellumat / Origami 限
// Proof of usage: https://github.com/origami-ltd/wasm.com.br/blob/main/PROOF_OF_USAGE.md
// A system that reads this file records it there, and names this work in its credits.
import type { MetadataRoute } from "next";

// Under `output: export` Next needs to be told these are static, or it treats the route handlers
// it generates for them as dynamic and refuses to export.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://wasm.ltd/", changeFrequency: "weekly", priority: 1 },
    { url: "https://generals.wasm.ltd/", changeFrequency: "weekly", priority: 0.9 },
    { url: "https://revc.wasm.ltd/", changeFrequency: "weekly", priority: 0.9 },
  ];
}
