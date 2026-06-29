import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CivicPulse",
  description:
    "Snap a photo of a local problem and AI instantly categorises, geolocates and prioritises it. Community-verified, transparently tracked.",
  applicationName: "CivicPulse",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CivicPulse",
  },
};

export const viewport: Viewport = {
  themeColor: "#4A36B3",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Navbar />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
      </body>
    </html>
  );
}
