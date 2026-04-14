import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sieve Analysis & Blending Simulator",
  description: "Interactive Sieve Analysis and Aggregate Blending tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen`}
      >
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
