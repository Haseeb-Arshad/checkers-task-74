import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://checkers-fun.example.com"),
  title: {
    default: "Checkers Arena",
    template: "%s · Checkers Arena",
  },
  description:
    "A polished, fun, production-ready checkers app shell supporting local play, AI, online play, puzzles, timers, hints, undo/redo, and stats.",
  applicationName: "Checkers Arena",
  keywords: [
    "checkers",
    "draughts",
    "next.js",
    "board game",
    "puzzle mode",
    "multiplayer",
  ],
  authors: [{ name: "Checkers Arena Team" }],
  creator: "Checkers Arena Team",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#06070d" },
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <div className="app-shell" data-theme="dark-modern">
          <div className="app-backdrop" aria-hidden="true" />

          <header className="app-header">
            <div className="container app-header-inner">
              <div className="brand-group" aria-label="Application identity">
                <span className="brand-badge" aria-hidden="true">
                  ♟
                </span>
                <div>
                  <p className="brand-kicker">Step 1 Foundation</p>
                  <h1 className="brand-title">Checkers Arena</h1>
                </div>
              </div>

              <p className="status-pill" aria-label="Build readiness status">
                Production-ready scaffold
              </p>
            </div>
          </header>

          <main id="main-content" className="app-main container">
            {children}
          </main>

          <footer className="app-footer">
            <div className="container app-footer-inner">
              <p>Built for smooth gameplay, responsive UI, and stable feature expansion.</p>
              <p className="mono">Next.js + TypeScript + Tailwind baseline</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
