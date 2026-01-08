// Store JSON pour les clients et factures
import fs from 'fs';
import path from 'path';
import { Client, Invoice, generateInvoiceNumber, generateAllinoneInvoiceNumber, Company, ALLINONE_TEMPLATES } from './invoice-types';

const DATA_DIR = path.join(process.cwd(), '.data');
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json');
const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');

// Assurer que le répertoire existe
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// ===== CLIENTS =====

interface ClientsStore {
  clients: Client[];
  lastUpdated: string;
}

function readClientsStore(): ClientsStore {
  ensureDataDir();
  if (!fs.existsSync(CLIENTS_FILE)) {
    return { clients: [], lastUpdated: new Date().toISOString() };
  }
  try {
    const data = fs.readFileSync(CLIENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { clients: [], lastUpdated: new Date().toISOString() };
  }
}

function writeClientsStore(store: ClientsStore) {
  ensureDataDir();
  store.lastUpdated = new Date().toISOString();
  fs.writeFileSync(CLIENTS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export function getAllClients(company?: Company): Client[] {
  const clients = readClientsStore().clients;
  if (company) {
    // Les clients sans champ company sont considérés comme ICONES (anciennes données)
    return clients.filter(c => {
      const clientCompany = c.company || 'icones';
      return clientCompany === company;
    });
  }
  return clients;
}

export function getClientById(id: string): Client | null {
  const clients = readClientsStore().clients;
  return clients.find(c => c.id === id) || null;
}

export function createClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Client {
  const store = readClientsStore();
  const now = new Date().toISOString();
  
  const newClient: Client = {
    ...data,
    id: `CLI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  };
  
  store.clients.push(newClient);
  writeClientsStore(store);
  
  return newClient;
}

export function updateClient(id: string, data: Partial<Client>): Client | null {
  const store = readClientsStore();
  const index = store.clients.findIndex(c => c.id === id);
  
  if (index === -1) return null;
  
  store.clients[index] = {
    ...store.clients[index],
    ...data,
    id, // Ne pas modifier l'ID
    updatedAt: new Date().toISOString(),
  };
  
  writeClientsStore(store);
  return store.clients[index];
}

export function deleteClient(id: string): boolean {
  const store = readClientsStore();
  const initialLength = store.clients.length;
  store.clients = store.clients.filter(c => c.id !== id);
  
  if (store.clients.length < initialLength) {
    writeClientsStore(store);
    return true;
  }
  return false;
}

// ===== FACTURES =====

interface InvoicesStore {
  invoices: Invoice[];
  lastInvoiceNumber: string;
  lastAllinoneNumber: string;
  lastUpdated: string;
}

function readInvoicesStore(): InvoicesStore {
  ensureDataDir();
  if (!fs.existsSync(INVOICES_FILE)) {
    return { invoices: [], lastInvoiceNumber: '', lastAllinoneNumber: '', lastUpdated: new Date().toISOString() };
  }
  try {
    const data = fs.readFileSync(INVOICES_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    // S'assurer que lastAllinoneNumber existe
    return {
      ...parsed,
      lastAllinoneNumber: parsed.lastAllinoneNumber || ''
    };
  } catch {
    return { invoices: [], lastInvoiceNumber: '', lastAllinoneNumber: '', lastUpdated: new Date().toISOString() };
  }
}

function writeInvoicesStore(store: InvoicesStore) {
  ensureDataDir();
  store.lastUpdated = new Date().toISOString();
  fs.writeFileSync(INVOICES_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export function getAllInvoices(company?: Company): Invoice[] {
  const store = readInvoicesStore();
  // Enrichir avec les données clients
  const clients = readClientsStore().clients;
  let invoices = store.invoices.map(inv => ({
    ...inv,
    client: clients.find(c => c.id === inv.clientId),
  }));
  
  // Filtrer par entreprise si spécifié
  // Les factures sans champ company sont considérées comme ICONES (anciennes données)
  if (company) {
    invoices = invoices.filter(inv => {
      const invoiceCompany = inv.company || 'icones'; // Par défaut ICONES pour les anciennes factures
      return invoiceCompany === company;
    });
  }
  
  return invoices;
}

export function getInvoiceById(id: string): Invoice | null {
  const store = readInvoicesStore();
  const clients = readClientsStore().clients;
  const invoice = store.invoices.find(i => i.id === id);
  if (!invoice) return null;
  return {
    ...invoice,
    client: clients.find(c => c.id === invoice.clientId),
  };
}

export function getInvoicesByClientId(clientId: string): Invoice[] {
  return getAllInvoices().filter(i => i.clientId === clientId);
}

export function getNextInvoiceNumber(userInitials?: string, company: Company = 'icones'): string {
  const store = readInvoicesStore();
  if (company === 'allinone') {
    return store.lastAllinoneNumber || 'N°001';
  }
  return generateInvoiceNumber(store.lastInvoiceNumber, userInitials);
}

export function createInvoice(data: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'> & { userInitials?: string; templateCode?: string }): Invoice {
  const store = readInvoicesStore();
  const now = new Date().toISOString();
  
  // Générer le numéro selon l'entreprise
  let invoiceNumber: string;
  const company = data.company || 'icones';
  
  if (company === 'allinone') {
    // Format ALL IN ONE: N°XXX/CODE/Mois/Année
    const templateCode = data.templateCode || 'C.E';
    invoiceNumber = generateAllinoneInvoiceNumber(store.lastAllinoneNumber, templateCode);
    store.lastAllinoneNumber = invoiceNumber;
  } else {
    // Format ICONES: FAC-XX/JJ/MM/AAAA/0001
    invoiceNumber = generateInvoiceNumber(store.lastInvoiceNumber, data.userInitials);
    store.lastInvoiceNumber = invoiceNumber;
  }
  
  // Retirer les champs temporaires
  const { userInitials, templateCode, ...invoiceData } = data;
  
  const newInvoice: Invoice = {
    ...invoiceData,
    id: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    invoiceNumber,
    company,
    createdAt: now,
    updatedAt: now,
    createdByInitials: userInitials || 'XX',
  } as Invoice;
  
  store.invoices.push(newInvoice);
  writeInvoicesStore(store);
  
  // Retourner avec les données client
  const client = getClientById(data.clientId);
  return { ...newInvoice, client: client || undefined };
}

export function updateInvoice(id: string, data: Partial<Invoice>): Invoice | null {
  const store = readInvoicesStore();
  const index = store.invoices.findIndex(i => i.id === id);
  
  if (index === -1) return null;
  
  store.invoices[index] = {
    ...store.invoices[index],
    ...data,
    id, // Ne pas modifier l'ID
    invoiceNumber: store.invoices[index].invoiceNumber, // Ne pas modifier le numéro
    updatedAt: new Date().toISOString(),
  };
  
  writeInvoicesStore(store);
  
  // Retourner avec les données client
  const client = getClientById(store.invoices[index].clientId);
  return { ...store.invoices[index], client: client || undefined };
}

export function deleteInvoice(id: string): boolean {
  const store = readInvoicesStore();
  const initialLength = store.invoices.length;
  store.invoices = store.invoices.filter(i => i.id !== id);
  
  if (store.invoices.length < initialLength) {
    writeInvoicesStore(store);
    return true;
  }
  return false;
}

// Statistiques
export function getInvoiceStats(company?: Company) {
  const invoices = getAllInvoices(company);
  const now = new Date();
  
  const stats = {
    total: invoices.length,
    draft: 0,
    sent: 0,
    partial: 0,
    paid: 0,
    overdue: 0,
    cancelled: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
  };
  
  invoices.forEach(inv => {
    // Compter par statut
    if (inv.status in stats) {
      (stats as any)[inv.status]++;
    }
    stats.totalAmount += inv.total;
    
    if (inv.status === 'paid') {
      // Facture soldée
      stats.paidAmount += inv.total;
    } else if (inv.status === 'partial') {
      // Facture partiellement payée
      stats.paidAmount += inv.paidAmount || 0;
      stats.pendingAmount += (inv.total - (inv.paidAmount || 0));
    } else if (inv.status === 'sent' || inv.status === 'overdue') {
      stats.pendingAmount += inv.total;
    }
  });
  
  return stats;
}
