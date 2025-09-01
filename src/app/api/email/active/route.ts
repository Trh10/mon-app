import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
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

export async function GET(request: NextRequest) {
  try {
    const accountsData = loadAccounts();
    const activeAccount = accountsData.accounts.find(
      acc => acc.id === accountsData.activeAccount
    );

    return NextResponse.json({
      success: true,
      hasActiveAccount: !!activeAccount,
      activeAccount: activeAccount || null,
      totalAccounts: accountsData.accounts.length
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération du compte actif',
      hasActiveAccount: false,
      activeAccount: null
    }, { status: 500 });
  }
}
