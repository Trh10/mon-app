import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ACCOUNTS_FILE = join(process.cwd(), 'data', 'email-accounts.json');

interface AccountsData {
  accounts: any[];
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
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      require('fs').mkdirSync(dataDir, { recursive: true });
    }
    writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erreur sauvegarde comptes:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();
    const data = loadAccounts();
    
    // Vérifier que le compte existe
    const account = data.accounts.find(acc => acc.id === accountId);
    if (!account) {
      return NextResponse.json({
        success: false,
        error: 'Compte non trouvé'
      }, { status: 404 });
    }
    
    // Changer le compte actif
    data.activeAccount = accountId;
    saveAccounts(data);
    
    return NextResponse.json({
      success: true,
      activeAccount: accountId,
      message: `Basculé vers ${account.email}`
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erreur lors du changement de compte'
    }, { status: 500 });
  }
}
