import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BitRot — The Thought Decay Canvas",
  description:
    "BitRot is an infinite, draggable 2D canvas where your thoughts decay over time. Watch ideas fade, fragment, and dissolve into the void.",
  keywords: ["bitrot", "thought canvas", "note taking", "entropy", "idea decay"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased overflow-hidden h-screen w-screen">
        {children}
      </body>
    </html>
  );
}
