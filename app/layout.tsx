import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clash Market · Find your next village",
  description: "A Clash-inspired account marketplace with private nicknames and live chat.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
