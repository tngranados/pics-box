import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Boda Antonio y María - 16 agosto 2025",
  description: "Comparte tus fotos y videos de nuestro día especial",
  // Provide per-scheme theme colors so iOS Safari picks correct tint
  themeColor: [
  { media: "(prefers-color-scheme: light)", color: "#fdf2f8" },
  { media: "(prefers-color-scheme: dark)", color: "#fdf2f8" },
  ],
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" style={{ backgroundColor: '#fdf2f8' }}>
      <head>
  <meta name="color-scheme" content="light" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: '#fdf2f8' }}
      >
        {children}
      </body>
    </html>
  );
}
