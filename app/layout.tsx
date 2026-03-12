import type { Metadata, Viewport } from "next";
import { Inter, Fredoka } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://example.com"),
  title: {
    default: "Checkers Arena",
    template: "%s • Checkers Arena",
  },
  description:
    "A polished, fun checkers experience with local play, online-ready scaffolding, timers, hints, undo/redo, and long-term stats tracking.",
  applicationName: "Checkers Arena",
  keywords: [
    "checkers",
    "draughts",
    "next.js",
    "board game",
    "strategy",
    "multiplayer",
  ],
  openGraph: {
    title: "Checkers Arena",
    description:
      "A modern, responsive checkers game shell built for local multiplayer, AI, and online-ready extensions.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Checkers Arena",
    description:
      "A modern, responsive checkers game shell built for local multiplayer, AI, and online-ready extensions.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8ecf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentYear = new Date().getFullYear();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${fredoka.variable}`}>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>

        <div className="app-root" data-theme="dark-modern">
          <div className="app-bg" aria-hidden="true" />

          <header className="app-header">
            <div className="shell-container">
              <div>
                <p className="eyebrow">Ready for match day</p>
                <h1 className="brand">Checkers Arena</h1>
              </div>
              <p className="tagline">
                Fast turns, smart strategy, and playful competition.
              </p>
            </div>
          </header>

          <main id="main-content" className="app-main">
            <div className="shell-container">{children}</div>
          </main>

          <footer className="app-footer">
            <div className="shell-container footer-row">
              <p>Built for local multiplayer, AI, puzzles, and online expansion.</p>
              <p className="footer-meta">© {currentYear} Checkers Arena</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
