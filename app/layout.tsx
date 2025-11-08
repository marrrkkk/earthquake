import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { Navigation } from "@/components/navigation";
import { UserLocationCapture } from "@/components/user-location-capture";
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from "@/components/ui/sonner";
import Script

from "next/script";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Disaster Monitoring System",
  description: "Real-time disaster monitoring and alert system for the Philippines",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ConvexClientProvider>
            <UserLocationCapture />
            <Navigation />
            {children}
            <Toaster />
          </ConvexClientProvider>
        </body>
      </html>
       <Script async={true} data-cfasync="true" type="text/javascript" src="https://windy.app/widget3/windy_map_async.js"></Script>
    </ClerkProvider>
  );
}
