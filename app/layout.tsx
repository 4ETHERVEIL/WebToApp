import type { Metadata } from "next";
import { Inter, Space_Grotesk, Courier_Prime } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans" 
});

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"], 
  variable: "--font-mono" 
});

const courier = Courier_Prime({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: "--font-courier"
});

export const metadata: Metadata = {
  title: "WebToApp - Neo Brutalism",
  description: "Convert any website to native Android & iOS app. Bold, fast, no bullshit.",
  keywords: "web to app, android, ios, converter, pwa",
  authors: [{ name: "SANN404 FORUM" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${courier.variable}`}>
      <body className="antialiased font-mono">
        {children}
      </body>
    </html>
  );
}