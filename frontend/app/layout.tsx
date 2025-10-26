import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CropTech - Advanced Agricultural Management Platform",
  description: "Revolutionary agricultural technology platform for modern farming, crop management, and sustainable agriculture solutions.",
  keywords: ["agriculture", "farming", "crop management", "sustainable farming", "agricultural technology"],
  authors: [{ name: "CropTech Team" }],
  creator: "CropTech",
  publisher: "CropTech",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://croptech.com"),
  openGraph: {
    title: "CropTech - Advanced Agricultural Management Platform",
    description: "Revolutionary agricultural technology platform for modern farming, crop management, and sustainable agriculture solutions.",
    url: "https://croptech.com",
    siteName: "CropTech",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CropTech - Advanced Agricultural Management Platform",
    description: "Revolutionary agricultural technology platform for modern farming, crop management, and sustainable agriculture solutions.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#22c55e" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}