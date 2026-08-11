import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://wasm.com.br"),
  title: "wasm.com.br — Games that refuse to die",
  description:
    "A preservation and portability initiative: games that have already been decompiled or had " +
    "their source released, compiled to WebAssembly and running in the browser. No installer, " +
    "no emulator setup — your own copy, streamed.",
  alternates: { canonical: "https://wasm.com.br/" },
  openGraph: {
    type: "website",
    siteName: "wasm.com.br",
    title: "wasm.com.br — Games that refuse to die",
    description:
      "Decompiled classics compiled to WebAssembly, running in the browser. " +
      "Command & Conquer: Generals Zero Hour is live.",
    url: "https://wasm.com.br/",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  icons: { icon: "/wasm-logo.svg" },
  twitter: {
    card: "summary_large_image",
    title: "wasm.com.br — Games that refuse to die",
    description:
      "Decompiled classics compiled to WebAssembly, running in the browser. " +
      "Command & Conquer: Generals Zero Hour is live.",
    images: ["/og.png"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "wasm.com.br",
  url: "https://wasm.com.br/",
  description:
    "Preservation and portability initiative bringing decompiled games to the browser through WebAssembly.",
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
