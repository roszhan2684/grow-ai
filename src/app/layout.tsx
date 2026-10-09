import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (no build-time network fetch): CI builds were flaking on the Google Fonts download.
const bricolage = localFont({
  variable: "--font-bricolage",
  src: [
    { path: "./fonts/bricolage-grotesque-600.woff2", weight: "600" },
    { path: "./fonts/bricolage-grotesque-700.woff2", weight: "700" },
    { path: "./fonts/bricolage-grotesque-800.woff2", weight: "800" },
  ],
});
const inter = localFont({
  variable: "--font-inter",
  src: [
    { path: "./fonts/inter-400.woff2", weight: "400" },
    { path: "./fonts/inter-500.woff2", weight: "500" },
    { path: "./fonts/inter-600.woff2", weight: "600" },
  ],
});
const jetbrains = localFont({
  variable: "--font-jetbrains",
  src: [
    { path: "./fonts/jetbrains-mono-400.woff2", weight: "400" },
    { path: "./fonts/jetbrains-mono-500.woff2", weight: "500" },
  ],
});

export const metadata: Metadata = {
  title: { default: "GROW AI — Relationship intelligence for B2B growth", template: "%s · GROW AI" },
  description:
    "GROW AI models the people, content and interactions behind B2B pipeline as a graph, turns it into evidence-backed actions, and explains which touches contributed to revenue. Portfolio project · synthetic demo data.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
