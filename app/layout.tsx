import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://farhanangga.vercel.app"),
  title: {
    default: "Farhan Angga Riyanto - Portofolio Website",
    template: "%s | Farhan Angga Riyanto",
  },
  description:
    "Farhan Angga Riyanto is a Software Engineer, Photographer,  UI/UX Designer and Graphic Designer who have a lot experience",
  openGraph: {
    title: "Farhan Angga Riyanto - Software Engineer",
    description: "My portofolio Website",
    url: "https://farhanangga.vercel.app",
    siteName: "Farhan Angga",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
