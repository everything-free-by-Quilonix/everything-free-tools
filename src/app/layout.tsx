import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import type { ReactNode } from "react";

import { HydrationMarker } from "@/components/layout/hydration-marker";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader, SkipLink } from "@/components/layout/site-header";
import { site, siteUrl } from "@/config/site";

import "./globals.css";

// Self-hosted at build time by next/font: no request to a font CDN.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });

export const metadata: Metadata = {
  metadataBase: new URL(`${siteUrl}/`),
  title: { default: `${site.name}: ${site.tagline}`, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  referrer: "strict-origin-when-cross-origin",
  authors: [{ name: site.parent.name, url: site.parent.url }],
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom is never restricted (WCAG 1.4.4).
  themeColor: "#0a0a0f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <SkipLink />
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <SiteFooter />
        <HydrationMarker />
      </body>
    </html>
  );
}
