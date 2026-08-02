import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shared Expense",
  description: "Monthly shared expense list",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
