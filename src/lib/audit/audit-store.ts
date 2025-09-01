// Système de stockage des logs d'audit
import fs from 'fs';
import path from 'path';
import { AuditLog, AuditAction, AuditDetails } from './audit-types';

const AUDIT_FILE = path.join(process.cwd(), 'data', 'audit-logs.json');

// Assurer que le répertoire data existe
function ensureDataDirectory() {
  const dataDir = path.dirname(AUDIT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Charger les logs d'audit
export function getAuditLogs(): AuditLog[] {
  try {
    ensureDataDirectory();
    
    if (!fs.existsSync(AUDIT_FILE)) {
      return [];
    }
    
    const data = fs.readFileSync(AUDIT_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erreur lecture logs audit:', error);
    return [];
  }
}

// Sauvegarder les logs d'audit
function saveAuditLogs(logs: AuditLog[]): boolean {
  try {
    ensureDataDirectory();
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2));
    return true;
  } catch (error) {
    console.error('Erreur sauvegarde logs audit:', error);
    return false;
  }
}

// Générer un ID unique pour le log
function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// Ajouter un log d'audit
export function addAuditLog(
  requisitionId: string,
  userId: string,
  userName: string,
  userLevel: number,
  action: AuditAction,
  details: AuditDetails = {},
  ipAddress?: string,
  userAgent?: string
): boolean {
  try {
    const logs = getAuditLogs();
    
    const newLog: AuditLog = {
      id: generateAuditId(),
      requisitionId,
      userId,
      userName,
      userLevel,
      action,
      timestamp: new Date().toISOString(),
      details,
      ipAddress,
      userAgent
    };
    
    logs.push(newLog);
    
    // Garder seulement les 10000 derniers logs pour éviter un fichier trop volumineux
    if (logs.length > 10000) {
      logs.splice(0, logs.length - 10000);
    }
    
    return saveAuditLogs(logs);
  } catch (error) {
    console.error('Erreur ajout log audit:', error);
    return false;
  }
}

// Récupérer les logs pour une réquisition spécifique
export function getAuditLogsForRequisition(requisitionId: string): AuditLog[] {
  try {
    const allLogs = getAuditLogs();
    return allLogs.filter(log => log.requisitionId === requisitionId);
  } catch (error) {
    console.error('Erreur récupération logs réquisition:', error);
    return [];
  }
}

// Récupérer les logs pour un utilisateur spécifique
export function getAuditLogsForUser(userId: string): AuditLog[] {
  try {
    const allLogs = getAuditLogs();
    return allLogs.filter(log => log.userId === userId);
  } catch (error) {
    console.error('Erreur récupération logs utilisateur:', error);
    return [];
  }
}

// Récupérer les logs récents (dernières 24h par défaut)
export function getRecentAuditLogs(hoursBack: number = 24): AuditLog[] {
  try {
    const allLogs = getAuditLogs();
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    return allLogs.filter(log => new Date(log.timestamp) > cutoffTime);
  } catch (error) {
    console.error('Erreur récupération logs récents:', error);
    return [];
  }
}

// Supprimer les logs anciens (plus de X jours)
export function cleanupOldAuditLogs(daysToKeep: number = 90): boolean {
  try {
    const allLogs = getAuditLogs();
    const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    
    const filteredLogs = allLogs.filter(log => new Date(log.timestamp) > cutoffTime);
    
    return saveAuditLogs(filteredLogs);
  } catch (error) {
    console.error('Erreur nettoyage logs anciens:', error);
    return false;
  }
}
