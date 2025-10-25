import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavbarPartyTix from "../components/NavbarPartyTix";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "PartyTix",
  description: "PartyTix - Event Ticketing Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <NavbarPartyTix />
        <div style={{ paddingTop: '80px' }}>
          {children}
        </div>
      </body>
    </html>
  );
}