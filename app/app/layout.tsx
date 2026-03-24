import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emission Factor Comparator: How Much Do Carbon Databases Actually Agree?",
  description:
    "Side-by-side comparison of emission factors from EPA, DEFRA, and GHG Protocol. See where databases agree, where they diverge by up to 7x, and why: geographic differences, methodological choices, or circular sourcing. Built for sustainability PMs choosing defensible factors for Scope 1-3 reporting.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ backgroundColor: 'var(--ws-bg)' }}>{children}</body>
    </html>
  );
}
