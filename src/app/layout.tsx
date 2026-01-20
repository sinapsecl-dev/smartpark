import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans } from "next/font/google"; // Import Inter and Noto_Sans
import "./globals.css";
import ConditionalLayout from "./ConditionalLayout";
import Navbar from "@/components/layout/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0da2e7",
  minimumScale: 1,
  initialScale: 1,
  width: "device-width",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SmartParking - Terrazas del Sol V", // Updated title
  description: "Autonomous parking management for condominiums.", // Updated description
  manifest: "/manifest.json", // Add manifest link
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA meta tags */}
        <meta name="application-name" content="SmartParking" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SmartParking" />
        <meta name="description" content="Autonomous parking management for condominiums." />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#0da2e7" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#0da2e7" />
        <link rel="apple-touch-icon" href="/icons/apple-icon-180x180.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#0da2e7" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body
        className={`${inter.variable} ${notoSans.variable} antialiased`}
      >
        <ConditionalLayout navbar={<Navbar />}>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
