import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "../lib/query-provider";

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
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
