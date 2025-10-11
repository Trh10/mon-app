import type { Metadata, Viewport } from "next";
import { APP_NAME } from "@/config/branding";
import "./globals.css";
import { ensureSeedReset } from '@lib/seedReset';
import "../styles/email-content.css";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import { CodeAuthProvider } from "@/components/auth/CodeAuthContext";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";

const inter = Inter({ subsets: ["latin"] });

const AppMounts = dynamic(() => import("../components/AppMounts"), { ssr: false });

export const metadata: Metadata = {
  title: `${APP_NAME} - Plateforme de Collaboration`,
  description: `${APP_NAME} - Gestion d'emails, collaboration et workflow intelligent`,
  keywords: `email, collaboration, workflow, réquisitions, ${APP_NAME.toLowerCase()}`,
};

// Définition du viewport pour une adaptation mobile correcte
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  ensureSeedReset();
  return (
    <html lang="fr">
      <body className={inter.className + ' min-h-[100dvh]'}>
        <NotificationProvider>
          <CodeAuthProvider>
            <div className="app-shell flex flex-col h-[100dvh] overflow-hidden">
              <div className="app-main flex-1 overflow-auto">{children}</div>
            </div>
            <AppMounts />
          </CodeAuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}