import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofPocket — Memory-Native Payment Guardian",
  description: "Walrus memory, deterministic policy and Tatum-verified Sui settlement for autonomous payments.",
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
