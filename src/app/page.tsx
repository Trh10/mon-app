"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { LeftPane } from "@/components/LeftPane";
import { RightPane } from "@/components/RightPane";
import { ResizablePane } from "@/components/ResizablePane";
import { AIProvider } from "@/components/AIContext";
import { CodeAuthProvider } from "@/components/auth/CodeAuthContext";
import { AppWithAuth } from "@/components/AppWithAuth";
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
  return (
    <CodeAuthProvider>
      <AppWithAuth>
        <EmailApp />
      </AppWithAuth>
    </CodeAuthProvider>
  );
}

function EmailApp() {
  const [items, setItems] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState("INBOX");
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set());
  const [source, setSource] = useState("email");
  
  // États pour le compte actif
  const [activeAccount, setActiveAccount] = useState<any>(null);
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);

  // Vérifier les paramètres URL pour Gmail success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail_connected') === 'success') {
      // Supprimer le paramètre de l'URL et recharger les comptes
      window.history.replaceState({}, document.title, window.location.pathname);
      console.log('🎉 Gmail connecté avec succès, rechargement des comptes...');
      setTimeout(() => {
        checkActiveAccount();
      }, 1000);
    } else if (params.get('gmail_connected') === 'error') {
      window.history.replaceState({}, document.title, window.location.pathname);
      console.error('❌ Erreur connexion Gmail');
      setError('Erreur lors de la connexion Gmail');
    }
  }, []);

  // Vérifier le compte actif au chargement
  useEffect(() => {
    checkActiveAccount();
  }, []);

  const checkActiveAccount = async () => {
    try {
      setIsCheckingAccount(true);
      const response = await fetch('/api/email/active');
      if (response.ok) {
        const data = await response.json();
        if (data.hasActiveAccount) {
          setActiveAccount(data.activeAccount);
          loadEmailData(currentFolder, data.activeAccount);
        } else {
          setActiveAccount(null);
          loadWelcomeEmails();
        }
      } else {
        setActiveAccount(null);
        loadWelcomeEmails();
      }
    } catch (error) {
      console.error("Erreur vérification compte:", error);
      setActiveAccount(null);
      loadWelcomeEmails();
    } finally {
      setIsCheckingAccount(false);
    }
  };

  const loadWelcomeEmails = () => {
    const welcomeEmails: Email[] = [
      {
        id: 'welcome-1',
        subject: "🔗 Connectez votre premier compte email",
        from: 'system@pepitemail.com',
        fromName: 'ICONES BOX',
        date: new Date().toISOString(),
        snippet: "Cliquez sur le sélecteur de comptes dans le header pour vous connecter à Gmail, Outlook ou d'autres providers.",
        unread: true,
        hasAttachments: false
      }
    ] as any[];
    setItems(welcomeEmails);
  };

  // Fonction pour charger les emails avec pagination infinie
  const loadEmailData = useCallback(async (folder: string = 'INBOX', account: any = null, append: boolean = false) => {
    const currentAccount = account || activeAccount;
    
    if (!currentAccount) {
      loadWelcomeEmails();
      return;
    }

    try {
      if (!append) {
        setLoading(true);
        setError(null);
      }
      
      console.log("Chargement emails pour compte:", currentAccount.email, "dossier:", folder);
      
      const currentCount = append ? items.length : 0;
      
      // Charger les emails via l'API avec pagination
      const response = await fetch(`/api/email/emails?folder=${folder}&skip=${currentCount}&limit=100`);
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`📧 ${data.emails.length} emails chargés pour ${data.account.email}`);
        
        if (append) {
          // Ajouter les nouveaux emails en évitant les doublons
          setItems(prevItems => {
            const existingIds = new Set(prevItems.map(item => item.id));
            const newEmails = data.emails.filter((email: any) => !existingIds.has(email.id));
            return [...prevItems, ...newEmails];
          });
        } else {
          setItems(data.emails);
        }
      } else {
        throw new Error(data.error || 'Erreur de chargement');
      }
      
    } catch (e: any) {
      console.error("Erreur chargement emails:", e);
      setError(e.message);
      
      // En cas d'erreur, garder la liste telle quelle et afficher l'erreur
      if (!append) {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [activeAccount, items.length]);

  // Fonction pour charger plus d'emails (scroll infini)
  const loadMoreEmails = useCallback(() => {
    if (!loading && activeAccount) {
      loadEmailData(currentFolder, activeAccount, true);
    }
  }, [loadEmailData, loading, activeAccount, currentFolder]);

  // Chargement initial
  useEffect(() => {
    if (!isCheckingAccount && activeAccount) {
      loadEmailData(currentFolder);
    }
  }, [currentFolder, loadEmailData, isCheckingAccount, activeAccount]);

  const handleRefresh = () => {
    if (activeAccount) {
      loadEmailData(currentFolder);
    } else {
      checkActiveAccount();
    }
    setCheckedEmails(new Set());
  };

  const handleAccountChange = (account: any) => {
    setActiveAccount(account);
    if (account) {
      loadEmailData(currentFolder, account);
    } else {
      loadWelcomeEmails();
    }
  };

  const handleFolderChange = (newFolder: string) => {
    setCurrentFolder(newFolder);
  };

  const handleDisconnect = () => {
    // Fonction vide pour éviter les erreurs
    console.log("Déconnexion désactivée");
  };

  const handleSourceChange = (newSource: string) => {
    setSource(newSource);
    handleRefresh();
  };

  return (
    <AIProvider>
      <div className="h-screen flex flex-col">
        <Header 
          source={source}
          onSourceChange={handleSourceChange}
          currentFolder={currentFolder}
          onFolderChange={handleFolderChange}
          emailCredentials={undefined}
          onDisconnect={handleDisconnect}
          onRefresh={handleRefresh}
          userInfo={undefined}
          onAccountChange={handleAccountChange}
        />

        <div className="bg-gradient-to-r from-blue-50 to-green-50 border-b border-blue-200 px-4 py-2 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-blue-700 font-medium">📊 Source: {source}</span>
            {isCheckingAccount ? (
              <span className="text-orange-600">🔄 Vérification compte...</span>
            ) : activeAccount ? (
              <>
                <span className="text-green-700 font-medium">👤 {activeAccount.email.split('@')[0]}</span>
                <span className="text-blue-600">📧 {activeAccount.email}</span>
                <span className="text-purple-600">🔗 {activeAccount.provider.name}</span>
              </>
            ) : (
              <span className="text-red-600">❌ Aucun compte connecté</span>
            )}
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
              userInfo={undefined}
              onRefresh={handleRefresh}
              isConnected={false}
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
                    userInfo={{
                      userName: activeAccount?.email?.split('@')[0] || 'User',
                      email: activeAccount?.email || '',
                      provider: activeAccount?.provider?.name || ''
                    }}
                    onLoadMore={loadMoreEmails}
                  />
                </div>
              }
              rightPane={
                <div className="icones-panel h-full">
                  <RightPane 
                    items={items}
                    onRefresh={handleRefresh}
                    checkedEmails={checkedEmails}
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