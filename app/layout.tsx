import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/layout/ThemeToggle";
import type { Metadata, Viewport } from "next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OffLynk",
  description:
    "Decentralized, offline-capable E2E encrypted chat — no servers, no accounts.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OffLynk",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body style={{ fontFamily: "var(--font-inter, ui-sans-serif, system-ui, sans-serif)" }}>
        <ThemeProvider defaultTheme="dark" enableSystem>
          {children}
          {/* Global SVG Filters for Animations */}
          <svg style={{ visibility: "hidden", position: "absolute", width: 0, height: 0 }}>
            <defs>
              <filter id="gooey">
                <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                <feColorMatrix
                  in="blur"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                  result="gooey"
                />
                <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
              </filter>
            </defs>
          </svg>
        </ThemeProvider>
      </body>
    </html>
  );
}
