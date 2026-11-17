import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { CustomCursor } from "@/components/effects/CustomCursor";
import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";
import { SiteContentProvider } from "@/components/site/SiteContentProvider";
import { getHomepageLists, getSiteContent } from "@/lib/site-content";
import { IS_PRODUCTION_SITE, SITE_URL } from "@/lib/site";
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

export async function generateMetadata(): Promise<Metadata> {
  // The title and description are editable in the admin hub (Search appearance).
  const { seo } = await getSiteContent();
  const title = seo.title;
  const description = seo.description;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    robots: IS_PRODUCTION_SITE ? "index, follow" : "noindex, nofollow",
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
      description,
      images: [{ url: "/og-image.png" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [content, lists] = await Promise.all([getSiteContent(), getHomepageLists()]);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>
          <SiteContentProvider initial={content} lists={lists}>
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
          </SiteContentProvider>
        </Providers>
      </body>
    </html>
  );
}
