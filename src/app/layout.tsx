import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { AppRail } from "@/components/common/AppRail";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Musical DNA Visualizer",
  description: "Analyze songs to discover their musical DNA - structure, harmony, energy, and more. Explore connections between songs in 3D space.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body>
        <div className="p-3 sm:p-4">
          <div className="shell mx-auto max-w-[1320px] min-h-[calc(100vh-24px)] sm:min-h-[calc(100vh-32px)]">
            <AppRail />
            <main className="tray flex-1 min-w-0 sm:p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
