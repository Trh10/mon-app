"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { LeftPane } from "@/components/LeftPane";
import { RightPane } from "@/components/RightPane";
import { ResizablePane } from "@/components/ResizablePane";
import FocusInboxView from "@/components/FocusInboxView";
import { AIProvider } from "@/components/AIContext";
import type { Email } from "@/lib/types";
import { deriveUserName, nowUTCString } from "@/lib/email/credentials";

// Ajoute ces helpers en haut du fichier (après les imports)
function normCreds(c: any) {
  const out = { ...(c || {}) };
  if (out.provider === "firebase_gmail") out.provider = "gmail";
  if (!out.accessToken && out.access_token) out.accessToken = out.access_token;
  if (out.host && !out.imapHost) out.imapHost = out.host;
  if (out.port && !out.imapPort) out.imapPort = Number(out.port);
  if (typeof out.secure === "boolean" && typeof out.imapTls !== "boolean") out.imapTls = out.secure;
  return out;
}

export default function Page() {
  const router = useRouter();
  const [items, setItems] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState("INBOX");
  const [focusMode, setFocusMode] = useState(false);
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set());
  const [source, setSource] = useState("email");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailCredentials, setEmailCredentials] = useState<any>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  // Vérifier l'authentification au montage
  useEffect(() => {
    const checkAuth = () => {
      try {
        const savedCredentials = localStorage.getItem('email_credentials');
        if (savedCredentials) {
          const credentials = JSON.parse(atob(savedCredentials));
          const normalizedCredentials = normCreds(credentials);
          
          setEmailCredentials(normalizedCredentials);
          setUserInfo({
            userName: normalizedCredentials.userName || normalizedCredentials.email?.split('@')[0] || "Utilisateur",
            email: normalizedCredentials.email,
            provider: normalizedCredentials.provider,
            timestamp: normalizedCredentials.timestamp || new Date().toISOString()
          });
          setIsAuthenticated(true);
        } else {
          // Pas de credentials, rediriger vers login
          router.push('/login');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification d\'authentification:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  // Fonction de déconnexion
  const handleLogout = () => {
    localStorage.removeItem('email_credentials');
    router.push('/login');
  };

  // Fonction pour charger les emails
  const loadEmailData = useCallback(async (folder: string = 'INBOX') => {
    if (!emailCredentials || !isAuthenticated) {
      return; // Ne pas charger si pas authentifié
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("Chargement emails pour:", emailCredentials.email);
      
      const response = await fetch('/api/email/universal-connect', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${btoa(JSON.stringify(emailCredentials))}`
        },
        body: JSON.stringify({
          email: emailCredentials.email,
          provider: emailCredentials.provider,
          userName: emailCredentials.userName,
          folder: folder,
          timestamp: nowUTCString(),
          forceRefresh: true
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.emails && Array.isArray(data.emails)) {
          setItems(data.emails);
        } else {
          setItems([]);
        }
      } else {
        throw new Error(`Erreur ${response.status}`);
      }
      
    } catch (e: any) {
      console.error("Erreur chargement:", e);
      setError(e.message);
      
      // Emails de test en cas d'erreur
      const testEmails: Email[] = [
        {
          id: 'test-1',
          subject: "Email de test - Interface fonctionnelle",
          from: 'test@example.com',
          fromName: 'Test System',
          date: new Date().toISOString(),
          snippet: "L'interface fonctionne correctement. Problème d'authentification Gmail à résoudre.",
          unread: true,
          hasAttachments: false
        }
      ] as any[];
      
      setItems(testEmails);
    } finally {
      setLoading(false);
    }
  }, [emailCredentials, isAuthenticated]);

  // Chargement initial
  useEffect(() => {
    if (isAuthenticated && emailCredentials) {
      loadEmailData(currentFolder);
    }
  }, [currentFolder, loadEmailData, isAuthenticated, emailCredentials]);

  const handleRefresh = () => {
    loadEmailData(currentFolder);
    setCheckedEmails(new Set());
  };

  const handleFolderChange = (newFolder: string) => {
    setCurrentFolder(newFolder);
  };

  const handleDisconnect = () => {
    handleLogout();
  };

  const handleSourceChange = (newSource: string) => {
    setSource(newSource);
    if (newSource === "mock") {
      const mockEmails: Email[] = [
        {
          id: 'mock-1',
          subject: "Email de démonstration",
          from: 'demo@test.com',
          fromName: 'Démonstration',
          date: new Date().toISOString(),
          snippet: "Ceci est un email de démonstration pour tester l'interface.",
          unread: true,
          hasAttachments: false
        }
      ] as any[];
      setItems(mockEmails);
    } else {
      handleRefresh();
    }
  };

  if (focusMode) {
    return (
      <FocusInboxView 
        currentFolder={currentFolder}
        onClose={() => setFocusMode(false)}
        emailCredentials={emailCredentials}
        userInfo={userInfo}
      />
    );
  }

  // Afficher un loader pendant la vérification d'authentification
  if (!isAuthenticated || !emailCredentials || !userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  return (
    <AIProvider>
      <div className="h-screen flex flex-col">
        <Header 
          source={source}
          onSourceChange={handleSourceChange}
          currentFolder={currentFolder}
          onFolderChange={handleFolderChange}
          onFocusMode={() => setFocusMode(true)}
          emailCredentials={emailCredentials}
          onDisconnect={handleDisconnect}
          onRefresh={handleRefresh}
          userInfo={userInfo}
        />

        <div className="bg-gradient-to-r from-blue-50 to-green-50 border-b border-blue-200 px-4 py-2 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-blue-700 font-medium">📊 Source: {source}</span>
            <span className="text-green-700 font-medium">👤 {userInfo.userName}</span>
            <span className="text-blue-600">📧 {userInfo.email}</span>
            <span className="text-orange-600 font-medium">📁 {currentFolder}</span>
            <span className="text-blue-600">📧 {items.length} emails</span>
          </div>
          {error && <div className="text-red-600">⚠️ {error}</div>}
          {loading && <div className="text-blue-600">🔄 Chargement...</div>}
        </div>
        
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="w-64 icones-sidebar">
            <Sidebar 
              currentFolder={currentFolder}
              onFolderChange={handleFolderChange}
              userInfo={userInfo}
              onRefresh={handleRefresh}
              isConnected={true}
            />
          </div>
          
          <div className="flex-1 min-w-0 p-2">
            <ResizablePane
              leftPane={
                <div className="icones-panel h-full">
                  <LeftPane 
                    items={items} 
                    loading={loading}
                    onRefresh={handleRefresh}
                    checkedEmails={checkedEmails}
                    setCheckedEmails={setCheckedEmails}
                    userInfo={userInfo}
                  />
                </div>
              }
              rightPane={
                <div className="icones-panel h-full">
                  <RightPane 
                    items={items}
                    onRefresh={handleRefresh}
                    checkedEmails={checkedEmails}
                    userInfo={userInfo}
                  />
                </div>
              }
              defaultLeftWidth={400}
              minLeftWidth={300}
              maxLeftWidth={600}
            />
          </div>
        </div>
      </div>
    </AIProvider>
  );
}