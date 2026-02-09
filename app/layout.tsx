import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { ToastProvider } from "@/components/ui/toast-provider";
import { SessionPrivacyGuard } from "@/components/SessionPrivacyGuard";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Evidentia — Don't trust the internet. Verify it.",
  description: "Truth Engine: multi-modal evidence analysis and structured Truth Reports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-[#070A12] text-[#E2E8F0]`}>
        <div className="bg-blobs">
          <div className="bg-blob bg-blob-1" />
          <div className="bg-blob bg-blob-2" />
          <div className="bg-blob bg-blob-3" />
        </div>
        <ToastProvider>
        <SessionPrivacyGuard />
        <div className="relative z-10">
          <NavBar />
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
        </div>
      </ToastProvider>
      </body>
    </html>
  );
}
