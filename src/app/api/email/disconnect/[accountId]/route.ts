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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const accountId = params.accountId;
    const data = loadAccounts();
    
    // Supprimer le compte
    data.accounts = data.accounts.filter(acc => acc.id !== accountId);
    
    // Si c'était le compte actif, le réinitialiser
    if (data.activeAccount === accountId) {
      data.activeAccount = data.accounts.length > 0 ? data.accounts[0].id : null;
    }
    
    saveAccounts(data);
    
    return NextResponse.json({
      success: true,
      message: 'Compte déconnecté avec succès'
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la déconnexion'
    }, { status: 500 });
  }
}
