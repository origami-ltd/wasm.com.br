import type { MetadataRoute } from "next";

// Under `output: export` Next needs to be told these are static, or it treats the route handlers
// it generates for them as dynamic and refuses to export.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://wasm.com.br/sitemap.xml",
  };
}
