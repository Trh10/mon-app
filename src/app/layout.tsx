import type { Metadata } from "next";
import "./globals.css";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

const AppMounts = dynamic(() => import("../components/AppMounts"), { ssr: false });

export const metadata: Metadata = {
  title: "Pépite Mail IA - Assistant Email Intelligent",
  description: "Accédez à vos emails avec l'IA - Gmail, Yahoo, Outlook, IMAP",
  keywords: "email, IA, assistant, gmail, yahoo, outlook, imap",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {children}
        <AppMounts />
      </body>
    </html>
  );
}