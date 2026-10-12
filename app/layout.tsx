import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import NavBar, { NavBarFallback } from "./NavBar";
import ChatWidgetGate from "./components/ChatWidgetGate";

// Expressive-serif system: Fraunces (variable, with its SOFT/WONK axes) for display,
// Hanken Grotesk for reading, JetBrains Mono for labels and numbers.
const fraunces = Fraunces({
  variable: "--font-display",
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  subsets: ["latin"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Research Pulse",
  description: "Weekly AI research brief for a senior AI-strategy consultant.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hanken.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      {/* Content on the left, navigation in a column on the right (top bar on small screens). */}
      <body className="flex min-h-full flex-col sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        <Suspense fallback={<NavBarFallback />}>
          <NavBar />
        </Suspense>
        <ChatWidgetGate />
      </body>
    </html>
  );
}
