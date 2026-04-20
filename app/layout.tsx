import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";

import { AppToaster } from "@/components/ui/app-toaster";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Igloo Foretracker",
  description: "Igloo 订单追踪系统",
  icons: {
    icon: "/igloo-favicon.svg",
    shortcut: "/igloo-favicon.svg",
    apple: "/igloo-favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f9fafb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col font-sans">
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
