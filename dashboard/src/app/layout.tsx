import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "./context/Web3Provider";
import { ToastProvider } from "./context/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MaveriX Oracle Terminal",
  description: "Real-time ETH/USD oracle dashboard powered by Chainlink on Sepolia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ToastProvider>
          <Web3Provider>{children}</Web3Provider>
        </ToastProvider>
      </body>
    </html>
  );
}
