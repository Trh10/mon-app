import type { Metadata } from "next";
import "./globals.css";
import "../styles/email-content.css";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import { CodeAuthProvider } from "@/components/auth/CodeAuthContext";

const inter = Inter({ subsets: ["latin"] });

const AppMounts = dynamic(() => import("../components/AppMounts"), { ssr: false });

export const metadata: Metadata = {
  title: "ICONES BOX - Plateforme de Collaboration",
  description: "ICONES BOX - Gestion d'emails, collaboration et workflow intelligent",
  keywords: "email, collaboration, workflow, réquisitions, icones box",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <CodeAuthProvider>
          {children}
          <AppMounts />
        </CodeAuthProvider>
      </body>
    </html>
  );
}