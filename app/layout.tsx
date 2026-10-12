import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import NavBar, { NavBarFallback } from "./NavBar";
import ChatWidgetGate from "./components/ChatWidgetGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  weight: "400",
  style: ["normal", "italic"],
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
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      {/* Content on the left, navigation in a column on the right (top bar on small screens). */}
      <body className="flex min-h-full flex-col lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        <Suspense fallback={<NavBarFallback />}>
          <NavBar />
        </Suspense>
        <ChatWidgetGate />
      </body>
    </html>
  );
}
