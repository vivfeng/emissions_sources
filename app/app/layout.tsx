import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emission Factor Source Comparator",
  description:
    "Compare emission factors across EPA, DEFRA, and GHG Protocol for the same business activities",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
