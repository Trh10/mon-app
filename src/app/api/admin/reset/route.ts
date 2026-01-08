import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { existsSync, unlinkSync, writeFileSync } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API pour réinitialiser complètement la plateforme
 * ATTENTION: Supprime TOUTES les données !
 */
export async function POST(req: NextRequest) {
  try {
    const results = {
      prisma: { users: 0, organizations: 0, messages: 0 },
      store: { users: 0, companies: 0 },
      errors: [] as string[],
    };

    // 1. Supprimer toutes les données Prisma
    console.log("Suppression des données Prisma...");
    
    try {
      // Supprimer dans l'ordre pour respecter les contraintes de clés étrangères
      const deletedMessages = await prisma.message.deleteMany({});
      results.prisma.messages = deletedMessages.count;
      
      // Supprimer les autres tables liées aux utilisateurs
      try { await prisma.emailActiveSelection.deleteMany({}); } catch {}
      try { await prisma.emailAccount.deleteMany({}); } catch {}
      try { await prisma.activityLog.deleteMany({}); } catch {}
      try { await prisma.taskRun.deleteMany({}); } catch {}
      try { await prisma.task.deleteMany({}); } catch {}
      try { await prisma.needWorkflowStep.deleteMany({}); } catch {}
      try { await prisma.needAttachment.deleteMany({}); } catch {}
      try { await prisma.need.deleteMany({}); } catch {}
      try { await prisma.workflowStep.deleteMany({}); } catch {}
      try { await prisma.requisition.deleteMany({}); } catch {}
      try { await prisma.meeting.deleteMany({}); } catch {}
      
      const deletedUsers = await prisma.user.deleteMany({});
      results.prisma.users = deletedUsers.count;
      
      const deletedOrgs = await prisma.organization.deleteMany({});
      results.prisma.organizations = deletedOrgs.count;
      
    } catch (e: any) {
      results.errors.push(`Prisma: ${e.message}`);
    }

    // 2. Supprimer les fichiers du store JSON
    console.log("Suppression des fichiers store...");
    
    const DATA_DIR = path.join(process.cwd(), ".data");
    const COMP_FILE = path.join(DATA_DIR, "companies.json");
    const USER_FILE = path.join(DATA_DIR, "users.json");

    try {
      if (existsSync(USER_FILE)) {
        // Lire pour compter avant de supprimer
        const fs = require("fs");
        const users = JSON.parse(fs.readFileSync(USER_FILE, "utf8"));
        results.store.users = Array.isArray(users) ? users.length : 0;
        // Écrire un tableau vide
        writeFileSync(USER_FILE, "[]");
      }
    } catch (e: any) {
      results.errors.push(`Store users: ${e.message}`);
    }

    try {
      if (existsSync(COMP_FILE)) {
        const fs = require("fs");
        const companies = JSON.parse(fs.readFileSync(COMP_FILE, "utf8"));
        results.store.companies = Array.isArray(companies) ? companies.length : 0;
        // Écrire un tableau vide
        writeFileSync(COMP_FILE, "[]");
      }
    } catch (e: any) {
      results.errors.push(`Store companies: ${e.message}`);
    }

    // 3. Vider le cache mémoire du store (si le serveur est toujours en cours d'exécution)
    try {
      const g = globalThis as any;
      if (g.__CHAT_STORE__) {
        g.__CHAT_STORE__.clear();
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: "🗑️ Plateforme réinitialisée avec succès !",
      deleted: results,
      nextStep: "Vous pouvez maintenant créer une nouvelle entreprise en vous connectant.",
    });
  } catch (error: any) {
    console.error("Erreur reset:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * GET: Voir l'état actuel avant reset
 */
export async function GET(req: NextRequest) {
  try {
    const userCount = await prisma.user.count();
    const orgCount = await prisma.organization.count();
    const msgCount = await prisma.message.count();

    // Lire le store JSON
    let storeUsers = 0;
    let storeCompanies = 0;
    
    const DATA_DIR = path.join(process.cwd(), ".data");
    const COMP_FILE = path.join(DATA_DIR, "companies.json");
    const USER_FILE = path.join(DATA_DIR, "users.json");

    try {
      if (existsSync(USER_FILE)) {
        const fs = require("fs");
        const users = JSON.parse(fs.readFileSync(USER_FILE, "utf8"));
        storeUsers = Array.isArray(users) ? users.length : 0;
      }
    } catch {}

    try {
      if (existsSync(COMP_FILE)) {
        const fs = require("fs");
        const companies = JSON.parse(fs.readFileSync(COMP_FILE, "utf8"));
        storeCompanies = Array.isArray(companies) ? companies.length : 0;
      }
    } catch {}

    return NextResponse.json({
      prisma: {
        users: userCount,
        organizations: orgCount,
        messages: msgCount,
      },
      store: {
        users: storeUsers,
        companies: storeCompanies,
      },
      warning: "⚠️ POST sur cette route supprimera TOUTES ces données !",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
