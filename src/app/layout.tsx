import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boda Antonio y María - 16 agosto 2025",
  description: "Comparte tus fotos y videos de nuestra boda especial",
  manifest: "/manifest.json",
  themeColor: "#ec4899",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Antonio y María",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Antonio y María" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
