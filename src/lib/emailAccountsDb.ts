import { prisma } from '@/lib/db';
import { SessionData } from '@/lib/session';

export type DbEmailAccount = {
  id: string;
  email: string;
  provider: any;
  providerId: string;
  providerName?: string | null;
  credentials?: any;
  isConnected?: boolean;
  unreadCount?: number;
  connectedAt?: string | null;
  lastSync?: string | null;
};

function ensureCtx(session: SessionData) {
  if (!session.organizationId || !session.userId) {
    throw new Error('Unauthorized: missing organization or user');
  }
}

export async function listAccounts(session: SessionData): Promise<{ accounts: DbEmailAccount[]; activeAccount: string | null; }> {
  ensureCtx(session);
  const db: any = prisma as any;
  const [accounts, activeSel] = await Promise.all([
    db.emailAccount.findMany({
      where: { organizationId: session.organizationId!, OR: [{ userId: session.userId! }, { userId: null }] },
      orderBy: { createdAt: 'asc' }
    }),
    db.emailActiveSelection.findUnique({ where: { organizationId_userId: { organizationId: session.organizationId!, userId: session.userId! } } })
  ]);
  return {
    accounts: (accounts as any[]).map((a: any) => ({
      id: a.id,
      email: a.email,
      provider: (a.provider as any) ?? { id: a.providerId, name: a.providerName ?? a.providerId },
      providerId: a.providerId,
      providerName: a.providerName,
      credentials: a.credentials as any,
      isConnected: a.isConnected,
      unreadCount: a.unreadCount ?? 0,
      connectedAt: a.connectedAt ? a.connectedAt.toISOString() : null,
      lastSync: a.lastSync ? a.lastSync.toISOString() : null,
    })),
    activeAccount: activeSel?.accountId ?? null,
  };
}

export async function getActiveAccount(session: SessionData) {
  ensureCtx(session);
  const db: any = prisma as any;
  const sel = await db.emailActiveSelection.findUnique({ where: { organizationId_userId: { organizationId: session.organizationId!, userId: session.userId! } } });
  if (!sel) return null;
  const a = await db.emailAccount.findFirst({ where: { id: sel.accountId, organizationId: session.organizationId! } });
  return a;
}

export async function setActiveAccount(session: SessionData, accountId: string) {
  ensureCtx(session);
  const db: any = prisma as any;
  const exists = await db.emailAccount.findFirst({ where: { id: accountId, organizationId: session.organizationId! } });
  if (!exists) return false;
  await db.emailActiveSelection.upsert({
    where: { organizationId_userId: { organizationId: session.organizationId!, userId: session.userId! } },
    update: { accountId },
    create: { organizationId: session.organizationId!, userId: session.userId!, accountId }
  });
  return true;
}

export async function upsertAccount(session: SessionData, input: Omit<DbEmailAccount, 'id'> & { id?: string }) {
  ensureCtx(session);
  const { id, email, provider, providerId, providerName, credentials, isConnected = true, unreadCount = 0, connectedAt, lastSync } = input;
  const data = {
    organizationId: session.organizationId!,
    userId: session.userId!,
    email,
    providerId,
    providerName: providerName ?? (provider?.name ?? providerId),
    provider: provider as any,
    credentials: credentials as any,
    isConnected,
    unreadCount,
    connectedAt: connectedAt ? new Date(connectedAt) : new Date(),
    lastSync: lastSync ? new Date(lastSync) : null,
  } as any;
  const db: any = prisma as any;
  const account = id
    ? await db.emailAccount.update({ where: { id }, data })
    : await db.emailAccount.create({ data });
  return account;
}

export async function removeAccount(session: SessionData, accountId: string) {
  ensureCtx(session);
  // Ensure same org
  const db: any = prisma as any;
  const acc = await db.emailAccount.findFirst({ where: { id: accountId, organizationId: session.organizationId! } });
  if (!acc) return false;
  await db.$transaction([
    db.emailActiveSelection.deleteMany({ where: { organizationId: session.organizationId!, accountId } }),
    db.emailAccount.delete({ where: { id: accountId } })
  ]);
  return true;
}
