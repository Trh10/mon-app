/**
 * Script de migration: JSON → PostgreSQL (Neon)
 * Migre les données de data/*.json vers la base Bolt
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { hashPin } from '../src/lib/hash';

const prisma = new PrismaClient();

interface LegacyUser {
  id: string;
  code: string;
  name: string;
  email?: string;
  level: number;
  levelName: string;
  companyId: string;
  companyCode: string;
  department?: string;
  position?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LegacyEmailAccount {
  id: string;
  userId?: string;
  email: string;
  providerId: string;
  providerName: string;
  credentials?: any;
  isConnected: boolean;
  unreadCount?: number;
  lastSync?: string;
  createdAt: string;
}

interface LegacyAuditLog {
  id: string;
  userId?: string;
  subjectType: string;
  subjectId?: string;
  action: string;
  detail?: string;
  createdAt: string;
}

async function migrateData() {
  console.log('🚀 Début de la migration JSON → PostgreSQL\n');

  try {
    // 1. Créer une organisation par défaut si elle n'existe pas
    let org = await prisma.organization.findUnique({ where: { slug: 'default-org' } });
    if (!org) {
      console.log('📦 Création de l\'organisation par défaut...');
      org = await prisma.organization.create({
        data: {
          name: 'Organisation par défaut',
          slug: 'default-org',
        }
      });
      console.log(`✅ Organisation créée: ${org.name} (ID: ${org.id})\n`);
    } else {
      console.log(`✅ Organisation existante: ${org.name} (ID: ${org.id})\n`);
    }

    // 2. Migrer les utilisateurs
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    if (existsSync(usersPath)) {
      console.log('👥 Migration des utilisateurs...');
      const usersData: LegacyUser[] = JSON.parse(readFileSync(usersPath, 'utf-8'));
      
      for (const legacyUser of usersData) {
        const existingUser = await prisma.user.findFirst({
          where: {
            organizationId: org.id,
            name: legacyUser.name
          }
        });

        if (!existingUser) {
          // Générer un PIN par défaut sécurisé (à changer par l'utilisateur)
          const defaultPin = '1234'; // PIN temporaire
          const pinHash = hashPin(defaultPin);

          const user = await prisma.user.create({
            data: {
              organizationId: org.id,
              externalId: legacyUser.id,
              email: legacyUser.email,
              displayName: legacyUser.name,
              name: legacyUser.name,
              pinHash: pinHash,
              role: legacyUser.level >= 10 ? 'admin' : legacyUser.level >= 8 ? 'user' : 'viewer',
              createdAt: new Date(legacyUser.createdAt),
              updatedAt: new Date(legacyUser.updatedAt)
            }
          });
          console.log(`  ✅ Utilisateur créé: ${user.name} (niveau ${legacyUser.level})`);
        } else {
          console.log(`  ⏭️  Utilisateur existant: ${existingUser.name}`);
        }
      }
      console.log(`✅ ${usersData.length} utilisateurs traités\n`);
    } else {
      console.log('⚠️  Fichier users.json introuvable\n');
    }

    // 3. Migrer les comptes email
    const emailAccountsPath = path.join(process.cwd(), 'data', 'email-accounts.json');
    if (existsSync(emailAccountsPath)) {
      console.log('📧 Migration des comptes email...');
      const emailData: LegacyEmailAccount[] = JSON.parse(readFileSync(emailAccountsPath, 'utf-8'));
      
      for (const legacyEmail of emailData) {
        const existingAccount = await prisma.emailAccount.findFirst({
          where: {
            organizationId: org.id,
            email: legacyEmail.email
          }
        });

        if (!existingAccount) {
          // Trouver l'utilisateur correspondant
          let userId: number | null = null;
          if (legacyEmail.userId) {
            const user = await prisma.user.findFirst({
              where: {
                organizationId: org.id,
                externalId: legacyEmail.userId
              }
            });
            userId = user?.id || null;
          }

          const account = await prisma.emailAccount.create({
            data: {
              organizationId: org.id,
              userId: userId,
              email: legacyEmail.email,
              providerId: legacyEmail.providerId,
              providerName: legacyEmail.providerName,
              provider: { name: legacyEmail.providerName, id: legacyEmail.providerId },
              credentials: legacyEmail.credentials || null,
              isConnected: legacyEmail.isConnected,
              unreadCount: legacyEmail.unreadCount || 0,
              lastSync: legacyEmail.lastSync ? new Date(legacyEmail.lastSync) : null,
              createdAt: new Date(legacyEmail.createdAt)
            }
          });
          console.log(`  ✅ Compte email créé: ${account.email}`);
        } else {
          console.log(`  ⏭️  Compte email existant: ${existingAccount.email}`);
        }
      }
      console.log(`✅ ${emailData.length} comptes email traités\n`);
    } else {
      console.log('⚠️  Fichier email-accounts.json introuvable\n');
    }

    // 4. Migrer les logs d'audit
    const auditLogsPath = path.join(process.cwd(), 'data', 'audit-logs.json');
    if (existsSync(auditLogsPath)) {
      console.log('📝 Migration des logs d\'audit...');
      const auditData: LegacyAuditLog[] = JSON.parse(readFileSync(auditLogsPath, 'utf-8'));
      
      let migratedCount = 0;
      for (const legacyLog of auditData) {
        // Trouver l'utilisateur correspondant
        let userId: number | null = null;
        if (legacyLog.userId) {
          const user = await prisma.user.findFirst({
            where: {
              organizationId: org.id,
              externalId: legacyLog.userId
            }
          });
          userId = user?.id || null;
        }

        await prisma.activityLog.create({
          data: {
            organizationId: org.id,
            userId: userId,
            subjectType: legacyLog.subjectType,
            subjectId: legacyLog.subjectId ? BigInt(legacyLog.subjectId) : null,
            action: legacyLog.action,
            detail: legacyLog.detail,
            createdAt: new Date(legacyLog.createdAt)
          }
        });
        migratedCount++;
      }
      console.log(`✅ ${migratedCount} logs d'audit migrés\n`);
    } else {
      console.log('⚠️  Fichier audit-logs.json introuvable\n');
    }

    console.log('🎉 Migration terminée avec succès !');
    console.log('\n⚠️  IMPORTANT: Les utilisateurs migrés ont le PIN par défaut "1234"');
    console.log('   Demandez-leur de le changer dès la première connexion.\n');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
