import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { CustomCursor } from "@/components/effects/CustomCursor";
import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import { CommandPalette } from "@/components/CommandPalette";
import { LiveHealthWidget } from "@/components/LiveHealthWidget";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const title = SITE_TITLE;
const description = SITE_DESCRIPTION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  robots: "index, follow",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
  verification: {
    google: "fHNCG17Dtx4SsbYFQ2mzxvzGInh3GxrOPDSHAueft_M",
  },
  openGraph: {
    type: "website",
    url: "/",
    title,
    description:
      "Explore the professional portfolio of Adnan Bin Farook. Specializing in high-performance web architectures and cloud deployments.",
    images: [{ url: "/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description:
      "Software Engineer building modern web solutions with .NET and React.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[10000] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:font-bold focus:text-white dark:focus:text-black"
          >
            Skip to content
          </a>
          <CustomCursor />
          <Navbar />
          <main id="main" className="flex flex-1 flex-col">
            {children}
          </main>
          <Footer />
          <CommandPalette />
          <LiveHealthWidget />
        </Providers>
      </body>
    </html>
  );
}
