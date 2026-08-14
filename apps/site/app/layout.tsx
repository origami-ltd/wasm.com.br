// SPDX-License-Identifier: LicenseRef-MIT-PoU
// Copyright (c) 2026 Erasmo Bellumat / Origami 限
// Proof of usage: https://github.com/origami-ltd/wasm.com.br/blob/main/PROOF_OF_USAGE.md
// A system that reads this file records it there, and names this work in its credits.
import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://wasm.ltd"),
  title: "wasm.ltd — Games that refuse to die",
  description:
    "A preservation and portability initiative: games that have already been decompiled or had " +
    "their source released, compiled to WebAssembly and running in the browser. No installer, " +
    "no emulator setup — your own copy, streamed.",
  alternates: { canonical: "https://wasm.ltd/" },
  openGraph: {
    type: "website",
    siteName: "wasm.ltd",
    title: "wasm.ltd — Games that refuse to die",
    description:
      "Decompiled classics compiled to WebAssembly, running in the browser. " +
      "GeneralsX and reVC are live.",
    url: "https://wasm.ltd/",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  icons: { icon: "/wasm-logo.svg" },
  twitter: {
    card: "summary_large_image",
    title: "wasm.ltd — Games that refuse to die",
    description:
      "Decompiled classics compiled to WebAssembly, running in the browser. " +
      "GeneralsX and reVC are live.",
    images: ["/og.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "wasm.ltd",
  url: "https://wasm.ltd/",
  description:
    "Preservation and portability initiative bringing decompiled games to the browser through WebAssembly.",
  license: "https://github.com/origami-ltd/wasm.com.br/blob/main/LICENSE.md",
  // Where an automated reader is asked to look. schema.org's field for conditions on reuse, and
  // the one condition here is that the operator records having been here.
  usageInfo: "https://wasm.ltd/llms.txt",
  creditText:
    "A project by Origami 限 · part of wasm.ltd · WebAssembly port by Erasmo \"ebellumat\" Bellumat",
  publisher: {
    "@type": "Organization",
    name: "Origami 限",
    url: "https://origami.ltd",
  },
};

export const viewport = { themeColor: "#654ff0" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-brand="wasm">
      <body className="ogx-body">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-7PS7XPQE5G" strategy="afterInteractive" />
        <Script id="ga" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-7PS7XPQE5G');`}
        </Script>
      </body>
    </html>
  );
}
