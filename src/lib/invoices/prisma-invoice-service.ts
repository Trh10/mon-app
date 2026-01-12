// Service de facturation avec Prisma (PostgreSQL/Neon)
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// TYPES
// ============================================

export interface CreateClientData {
  company: 'icones' | 'allinone';
  companyName: string;
  contactName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  notes?: string;
}

export interface CreateInvoiceData {
  template: string;
  company: 'icones' | 'allinone';
  clientId: string;
  issueDate: Date;
  dueDate: Date;
  lines: {
    description: string;
    quantity: number;
    unitPrice: number;
    chargesTTC?: number;
    squareMeters?: number;
    days?: number;
  }[];
  sections?: {
    title: string;
    lines: {
      description: string;
      quantity?: number;
      squareMeters?: number;
      days?: number;
      unitPrice: number;
    }[];
  }[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  serviceType?: string;
  templateCode?: string;
  placementTVAEnabled?: boolean;
  chargesTTCMode?: boolean;
  transfertDeduction?: number;
  placementDeduction?: number;
  enablePlacementDeduction?: boolean;
  enableTransfertDeduction?: boolean;
  projectDescription?: string;
  projectName?: string;
  managementFeeRate?: number;
  commissionRate?: number;
  paymentTerms?: string;
  publicNotes?: string;
  notes?: string;
  createdBy: string;
  createdByInitials?: string;
  acomptes?: {
    acompte1?: { percent: number; amount: number } | null;
    acompte2?: { amount: number } | null;
    acompte3?: { amount: number } | null;
    totalPaye?: number;
  } | null;
}

// ============================================
// GÉNÉRATION NUMÉRO DE FACTURE
// ============================================

// Pour ICONES: FAC-2026-0001-TE ou PRO-2026-0001-TE
async function generateIconesInvoiceNumber(template: string, initials?: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = template.startsWith('proforma') ? 'PRO' : 'FAC';
  
  // Compter les factures ICONES de cette année
  const count = await prisma.invoice.count({
    where: {
      company: 'icones',
      invoiceNumber: {
        startsWith: `${prefix}-${year}`
      }
    }
  });
  
  const nextNum = (count + 1).toString().padStart(4, '0');
  const initialsStr = initials ? `-${initials}` : '';
  return `${prefix}-${year}-${nextNum}${initialsStr}`;
}

// Pour ALL IN ONE: N°012/C.E/Janv/26
async function generateAllinoneInvoiceNumber(templateCode: string): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const months = ['Janv', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
  const month = months[now.getMonth()];
  
  // Compter les factures ALL IN ONE de ce mois
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const count = await prisma.invoice.count({
    where: {
      company: 'allinone',
      issueDate: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }
  });
  
  const nextNum = (count + 1).toString().padStart(3, '0');
  return `N°${nextNum}/${templateCode}/${month}/${year}`;
}

// ============================================
// CLIENTS
// ============================================

export async function getClients(company?: 'icones' | 'allinone') {
  const where = company ? { company } : {};
  return prisma.invoiceClient.findMany({
    where,
    orderBy: { companyName: 'asc' },
    include: {
      _count: {
        select: { invoices: true }
      }
    }
  });
}

export async function getClientById(id: string) {
  return prisma.invoiceClient.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });
}

export async function createClient(data: CreateClientData) {
  return prisma.invoiceClient.create({
    data: {
      company: data.company,
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
      taxNumber: data.taxNumber,
      notes: data.notes,
    }
  });
}

export async function updateClient(id: string, data: Partial<CreateClientData>) {
  return prisma.invoiceClient.update({
    where: { id },
    data
  });
}

export async function deleteClient(id: string) {
  // Vérifier s'il y a des factures liées
  const invoiceCount = await prisma.invoice.count({
    where: { clientId: id }
  });
  
  if (invoiceCount > 0) {
    throw new Error(`Impossible de supprimer: ${invoiceCount} facture(s) liée(s)`);
  }
  
  return prisma.invoiceClient.delete({
    where: { id }
  });
}

// ============================================
// FACTURES
// ============================================

export async function getInvoices(company?: 'icones' | 'allinone', options?: {
  status?: string;
  clientId?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  
  if (company) where.company = company;
  if (options?.status) where.status = options.status;
  if (options?.clientId) where.clientId = options.clientId;
  
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      include: {
        client: true,
        lines: {
          orderBy: { sortOrder: 'asc' }
        },
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lines: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    }),
    prisma.invoice.count({ where })
  ]);
  
  return { invoices, total };
}

export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      lines: {
        orderBy: { sortOrder: 'asc' }
      },
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: {
          lines: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      },
      payments: {
        orderBy: { paymentDate: 'desc' }
      }
    }
  });
}

export async function getInvoiceByNumber(invoiceNumber: string) {
  return prisma.invoice.findUnique({
    where: { invoiceNumber },
    include: {
      client: true,
      lines: {
        orderBy: { sortOrder: 'asc' }
      },
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: {
          lines: {
            orderBy: { sortOrder: 'asc' }
          }
        }
      },
      payments: {
        orderBy: { paymentDate: 'desc' }
      }
    }
  });
}

export async function createInvoice(data: CreateInvoiceData) {
  // Générer le numéro de facture
  const invoiceNumber = data.company === 'icones'
    ? await generateIconesInvoiceNumber(data.template, data.createdByInitials)
    : await generateAllinoneInvoiceNumber(data.templateCode || 'C.E');
  
  // Récupérer les infos client pour le snapshot
  const client = await prisma.invoiceClient.findUnique({
    where: { id: data.clientId }
  });
  
  // Créer la facture avec ses lignes
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      template: data.template,
      company: data.company,
      clientId: data.clientId,
      clientSnapshot: client ? JSON.parse(JSON.stringify(client)) : null,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      subtotal: data.subtotal,
      taxRate: data.taxRate || 0,
      taxAmount: data.taxAmount || 0,
      total: data.total,
      serviceType: data.serviceType,
      templateCode: data.templateCode,
      placementTVAEnabled: data.placementTVAEnabled || false,
      chargesTTCMode: data.chargesTTCMode ?? true,
      transfertDeduction: data.transfertDeduction || 0,
      placementDeduction: data.placementDeduction || 0,
      enablePlacementDeduction: data.enablePlacementDeduction === true,
      enableTransfertDeduction: data.enableTransfertDeduction === true,
      projectDescription: data.projectDescription,
      projectName: data.projectName,
      managementFeeRate: data.managementFeeRate,
      commissionRate: data.commissionRate,
      acomptes: data.acomptes ? data.acomptes as Prisma.InputJsonValue : Prisma.JsonNull,
      paymentTerms: data.paymentTerms,
      publicNotes: data.publicNotes,
      notes: data.notes,
      createdBy: data.createdBy,
      createdByInitials: data.createdByInitials,
      status: 'draft',
      // Créer les lignes
      lines: {
        create: (data.lines || []).map((line, index) => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          total: line.quantity * line.unitPrice,
          chargesTTC: line.chargesTTC,
          squareMeters: line.squareMeters,
          days: line.days,
          sortOrder: index
        }))
      },
      // Créer les sections (pour Facture B)
      sections: data.sections ? {
        create: data.sections.map((section, sIndex) => ({
          title: section.title,
          subtotal: section.lines.reduce((sum, l) => sum + (l.quantity || 1) * l.unitPrice, 0),
          sortOrder: sIndex,
          lines: {
            create: section.lines.map((line, lIndex) => ({
              description: line.description,
              quantity: line.quantity || 1,
              squareMeters: line.squareMeters,
              days: line.days,
              unitPrice: line.unitPrice,
              total: (line.quantity || 1) * line.unitPrice,
              sortOrder: lIndex
            }))
          }
        }))
      } : undefined
    },
    include: {
      client: true,
      lines: true,
      sections: {
        include: { lines: true }
      }
    }
  });
  
  return invoice;
}

export async function updateInvoice(id: string, data: Partial<CreateInvoiceData> & { 
  status?: string;
  paidAmount?: number;
  paidAt?: string | Date;
  remainingAmount?: number;
  lines?: any[];
  sections?: any[];
  acomptes?: any;
  projectDescription?: string;
  projectName?: string;
  enablePlacementDeduction?: boolean;
  placementDeduction?: number;
  enableTransfertDeduction?: boolean;
  transfertDeduction?: number;
}) {
  // Mettre à jour les champs de base
  const updateData: any = {};
  
  if (data.clientId) updateData.clientId = data.clientId;
  if (data.issueDate) updateData.issueDate = new Date(data.issueDate);
  if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
  if (data.status) updateData.status = data.status;
  if (data.paymentTerms) updateData.paymentTerms = data.paymentTerms;
  if (data.publicNotes !== undefined) updateData.publicNotes = data.publicNotes;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
  if (data.taxRate !== undefined) updateData.taxRate = data.taxRate;
  if (data.taxAmount !== undefined) updateData.taxAmount = data.taxAmount;
  if (data.total !== undefined) updateData.total = data.total;
  
  // Champs spécifiques
  if (data.projectDescription !== undefined) updateData.projectDescription = data.projectDescription;
  if (data.projectName !== undefined) updateData.projectName = data.projectName;
  if (data.acomptes !== undefined) updateData.acomptes = data.acomptes;
  if (data.enablePlacementDeduction !== undefined) updateData.enablePlacementDeduction = data.enablePlacementDeduction;
  if (data.placementDeduction !== undefined) updateData.placementDeduction = data.placementDeduction;
  if (data.enableTransfertDeduction !== undefined) updateData.enableTransfertDeduction = data.enableTransfertDeduction;
  if (data.transfertDeduction !== undefined) updateData.transfertDeduction = data.transfertDeduction;
  
  // Gérer les paiements/avances
  if (data.paidAmount !== undefined) updateData.paidAmount = data.paidAmount;
  if (data.paidAt !== undefined) updateData.paidAt = data.paidAt ? new Date(data.paidAt) : null;
  
  // Utiliser une transaction pour mettre à jour les lignes et sections
  return prisma.$transaction(async (tx) => {
    // Mise à jour des lignes si fournies
    if (data.lines && data.lines.length > 0) {
      // Supprimer les anciennes lignes
      await tx.invoiceLine.deleteMany({
        where: { invoiceId: id }
      });
      
      // Créer les nouvelles lignes
      for (const line of data.lines) {
        await tx.invoiceLine.create({
          data: {
            invoiceId: id,
            description: line.description || '',
            quantity: line.quantity || 0,
            unitPrice: line.unitPrice || 0,
            total: (line.quantity || 1) * (line.unitPrice || 0),
            chargesTTC: line.chargesTTC || 0,
          }
        });
      }
    }
    
    // Mise à jour des sections si fournies (Facture B)
    if (data.sections && data.sections.length > 0) {
      // Supprimer les anciennes sections et leurs lignes
      const existingSections = await tx.invoiceSection.findMany({
        where: { invoiceId: id }
      });
      
      for (const section of existingSections) {
        await tx.invoiceSectionLine.deleteMany({
          where: { sectionId: section.id }
        });
      }
      
      await tx.invoiceSection.deleteMany({
        where: { invoiceId: id }
      });
      
      // Créer les nouvelles sections avec leurs lignes
      for (let i = 0; i < data.sections.length; i++) {
        const section = data.sections[i];
        const createdSection = await tx.invoiceSection.create({
          data: {
            invoiceId: id,
            title: section.title || '',
            sortOrder: i,
            subtotal: section.subtotal || 0,
          }
        });
        
        // Créer les lignes de la section
        if (section.lines && section.lines.length > 0) {
          for (let j = 0; j < section.lines.length; j++) {
            const line = section.lines[j];
            await tx.invoiceSectionLine.create({
              data: {
                sectionId: createdSection.id,
                description: line.description || '',
                quantity: line.quantity || 0,
                squareMeters: line.squareMeters || 0,
                days: line.days || 0,
                unitPrice: line.unitPrice || 0,
                total: line.total || 0,
                sortOrder: j,
                daysImpactPrice: line.daysImpactPrice !== false,
              }
            });
          }
        }
      }
    }
    
    // Mise à jour de la facture elle-même
    return tx.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        lines: true,
        sections: {
          include: { lines: true }
        },
        payments: true
      }
    });
  });
}

export async function deleteInvoice(id: string) {
  return prisma.invoice.delete({
    where: { id }
  });
}

// ============================================
// PAIEMENTS
// ============================================

export async function addPayment(invoiceId: string, data: {
  amount: number;
  paymentDate: Date;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}) {
  // Ajouter le paiement
  const payment = await prisma.invoicePayment.create({
    data: {
      invoiceId,
      amount: data.amount,
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod,
      reference: data.reference,
      notes: data.notes
    }
  });
  
  // Mettre à jour le montant payé et le statut
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true }
  });
  
  if (invoice) {
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const newStatus = totalPaid >= invoice.total ? 'paid' : totalPaid > 0 ? 'partial' : invoice.status;
    
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: totalPaid,
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date() : null
      }
    });
  }
  
  return payment;
}

// ============================================
// STATISTIQUES
// ============================================

export async function getInvoiceStats(company?: 'icones' | 'allinone') {
  const where = company ? { company } : {};
  
  // Récupérer toutes les factures pour calculer correctement
  const allInvoices = await prisma.invoice.findMany({ where });
  
  const total = allInvoices.length;
  const draft = allInvoices.filter(i => i.status === 'draft').length;
  const sent = allInvoices.filter(i => i.status === 'sent').length;
  const paid = allInvoices.filter(i => i.status === 'paid').length;
  const partial = allInvoices.filter(i => i.status === 'partial').length;
  const overdue = allInvoices.filter(i => 
    (i.status === 'sent' || i.status === 'partial') && 
    new Date(i.dueDate) < new Date()
  ).length;
  
  // Montant total de toutes les factures
  const totalAmount = allInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  
  // Montant des factures soldées (payées complètement)
  const paidInvoicesAmount = allInvoices
    .filter(i => i.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
  
  // Montant des avances sur factures en cours
  const partialPaidAmount = allInvoices
    .filter(i => i.status === 'partial')
    .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
  
  // Total encaissé = factures soldées + avances
  const totalPaidAmount = paidInvoicesAmount + partialPaidAmount;
  
  // Montant en cours = total - encaissé
  const pendingAmount = totalAmount - totalPaidAmount;
  
  return {
    total,
    draft,
    sent,
    paid,
    partial,
    overdue,
    totalAmount: totalAmount || 0,
    paidAmount: totalPaidAmount || 0,
    pendingAmount: pendingAmount || 0,
    // Pour compatibilité
    unpaidAmount: pendingAmount || 0
  };
}

// Export nommé pour utilisation dans les API routes
export const invoiceService = {
  // Clients
  getAllClients: getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  // Invoices
  getAllInvoices: getInvoices,
  getInvoiceById,
  getInvoiceByNumber,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  // Payments
  addPayment,
  // Stats
  getInvoiceStats
};

export default invoiceService;
