import type { Metadata } from "next";
import { Orbitron, Rajdhani, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["700", "800", "900"],
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  variable: "--font-rajdhani",
  weight: ["500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "StreamPix",
  description: "SaaS premium para alertas PIX com TTS, overlay e analytics para streamers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${orbitron.variable} ${rajdhani.variable} ${spaceGrotesk.variable} dark`}
    >
      <body className="bg-background text-foreground antialiased">
        {children}
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            className: "border border-white/10 bg-slate-950 text-white",
          }}
        />
      </body>
    </html>
  );
}
