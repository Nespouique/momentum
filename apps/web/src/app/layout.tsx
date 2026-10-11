import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { AccentColorProvider } from "@/components/theme/accent-color-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const accentColorScript = `
try {
  const stored = JSON.parse(localStorage.getItem("auth-storage") || "null");
  const color = stored?.state?.user?.accentColor;
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    const luminance = (hex) => {
      const channels = [1, 3, 5].map((start) => {
        const value = parseInt(hex.slice(start, start + 2), 16) / 255;
        return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const background = luminance(color);
    const dark = "#000000";
    const light = "#FFFFFF";
    const foreground =
      (background + 0.05) / (luminance(dark) + 0.05) >=
      (luminance(light) + 0.05) / (background + 0.05)
        ? dark
        : light;
    document.documentElement.style.setProperty("--primary", color);
    document.documentElement.style.setProperty("--primary-foreground", foreground);
    document.documentElement.style.setProperty("--ring", color);
  }
} catch {}
`;

export const metadata: Metadata = {
  title: "Momentum",
  description: "Track your fitness journey",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Momentum",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: accentColorScript }} />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <AccentColorProvider>{children}</AccentColorProvider>
        <Toaster richColors position="top-center" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
