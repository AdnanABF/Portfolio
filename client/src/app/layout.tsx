import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";
import "./globals.css";

const SITE_URL = "https://adnanbinfarook.com";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const title =
  "Adnan Bin Farook | Software Engineer - .NET, C#, MSSQL, Azure, React, NestJS, MongoDB";
const description =
  "Portfolio of Adnan Bin Farook, a Software Engineer specializing in modernizing legacy systems and building scalable full-stack applications with .NET, React, and NestJS.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  robots: "index, follow",
  alternates: { canonical: "/" },
  icons: { icon: "/abf_logo.png" },
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
          <Navbar />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
