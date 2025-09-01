import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ACCOUNTS_FILE = join(process.cwd(), 'data', 'email-accounts.json');

interface EmailAccount {
  id: string;
  email: string;
  provider: {
    id: string;
    name: string;
    type: string;
  };
  credentials: {
    email: string;
    password: string;
    imapServer?: string;
    imapPort?: string;
    smtpServer?: string;
    smtpPort?: string;
    useSSL?: boolean;
  };
  isConnected: boolean;
  lastSync: string;
  unreadCount: number;
  createdAt: string;
}

interface AccountsData {
  accounts: EmailAccount[];
  activeAccount: string | null;
}

function loadAccounts(): AccountsData {
  try {
    if (!existsSync(ACCOUNTS_FILE)) {
      return { accounts: [], activeAccount: null };
    }
    const data = readFileSync(ACCOUNTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { accounts: [], activeAccount: null };
  }
}

function saveAccounts(data: AccountsData) {
  try {
    // Créer le dossier data s'il n'existe pas
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      require('fs').mkdirSync(dataDir, { recursive: true });
    }
    writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erreur sauvegarde comptes:', error);
  }
}

function generateAccountId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Simuler la connexion email (en production, utiliser vraies APIs)
async function testEmailConnection(provider: any, credentials: any): Promise<{ success: boolean; unreadCount?: number; error?: string }> {
  // Simulation de test de connexion
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Vérifier les credentials basiques
  if (!credentials.email || !credentials.password) {
    return { success: false, error: 'Email et mot de passe requis' };
  }
  
  // Pour Gmail, vérifier le format
  if (provider.type === 'gmail' && !credentials.email.includes('@gmail.com')) {
    return { success: false, error: 'Adresse Gmail invalide' };
  }
  
  // Pour Outlook, vérifier le format
  if (provider.type === 'outlook' && !credentials.email.includes('@outlook.') && !credentials.email.includes('@hotmail.')) {
    return { success: false, error: 'Adresse Outlook/Hotmail invalide' };
  }
  
  // Simuler un nombre d'emails non lus
  const unreadCount = Math.floor(Math.random() * 50);
  
  return { success: true, unreadCount };
}

export async function GET() {
  try {
    const data = loadAccounts();
    return NextResponse.json({
      success: true,
      accounts: data.accounts.map(acc => ({
        id: acc.id,
        email: acc.email,
        provider: acc.provider,
        isConnected: acc.isConnected,
        lastSync: acc.lastSync,
        unreadCount: acc.unreadCount
      })),
      activeAccount: data.activeAccount
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erreur chargement comptes'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { provider, credentials } = await request.json();
    
    if (!provider || !credentials) {
      return NextResponse.json({
        success: false,
        error: 'Données manquantes'
      }, { status: 400 });
    }
    
    // Tester la connexion
    const connectionTest = await testEmailConnection(provider, credentials);
    
    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: connectionTest.error
      }, { status: 400 });
    }
    
    // Charger les comptes existants
    const data = loadAccounts();
    
    // Vérifier si le compte existe déjà
    const existingAccount = data.accounts.find(acc => acc.email === credentials.email);
    if (existingAccount) {
      return NextResponse.json({
        success: false,
        error: 'Ce compte email est déjà connecté'
      }, { status: 400 });
    }
    
    // Créer le nouveau compte
    const accountId = generateAccountId();
    const newAccount: EmailAccount = {
      id: accountId,
      email: credentials.email,
      provider: provider,
      credentials: credentials,
      isConnected: true,
      lastSync: new Date().toISOString(),
      unreadCount: connectionTest.unreadCount || 0,
      createdAt: new Date().toISOString()
    };
    
    // Ajouter à la liste
    data.accounts.push(newAccount);
    
    // Si c'est le premier compte, le définir comme actif
    if (!data.activeAccount) {
      data.activeAccount = accountId;
    }
    
    // Sauvegarder
    saveAccounts(data);
    
    return NextResponse.json({
      success: true,
      accountId: accountId,
      unreadCount: connectionTest.unreadCount || 0,
      message: 'Compte connecté avec succès'
    });
    
  } catch (error) {
    console.error('Erreur connexion compte:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { accountId } = await request.json();
    
    if (!accountId) {
      return NextResponse.json({
        success: false,
        error: 'ID de compte requis'
      }, { status: 400 });
    }
    
    const data = loadAccounts();
    
    // Trouver l'index du compte à supprimer
    const accountIndex = data.accounts.findIndex(acc => acc.id === accountId);
    
    if (accountIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Compte non trouvé'
      }, { status: 404 });
    }
    
    // Supprimer le compte
    data.accounts.splice(accountIndex, 1);
    
    // Si c'était le compte actif, choisir un autre ou null
    if (data.activeAccount === accountId) {
      data.activeAccount = data.accounts.length > 0 ? data.accounts[0].id : null;
    }
    
    // Sauvegarder
    saveAccounts(data);
    
    return NextResponse.json({
      success: true,
      message: 'Compte supprimé avec succès'
    });
    
  } catch (error) {
    console.error('Erreur suppression compte:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur'
    }, { status: 500 });
  }
}
