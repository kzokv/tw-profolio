import "./globals.css";
import type { ReactNode } from "react";
import { DM_Serif_Display, Libre_Franklin } from "next/font/google";
import { LoadingProgressBar } from "../components/ui/LoadingProgressBar";

const displayFont = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const bodyFont = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata = {
  title: "TW Portfolio",
  description: "Taiwan portfolio dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable} min-h-screen bg-bg text-ink antialiased`}>
        <LoadingProgressBar />
        {children}
      </body>
    </html>
  );
}
