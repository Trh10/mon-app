import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ensureOrgAndUserFromCookie } from "@/lib/auth/sessionBridge";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Primary: iron-session
    const session = await getSession(req);
    let organizationId = session.organizationId;
    let userId = session.userId;
    // Fallback: CodeAuthContext cookie bridge
    if (!organizationId || !userId) {
      const bridged = await ensureOrgAndUserFromCookie(req);
      if (bridged) { organizationId = bridged.organizationId; userId = bridged.userId ?? undefined; }
    }
    if (!organizationId) {
      return NextResponse.json({ error: "Session requise" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;

    if (!file || !title) {
      return NextResponse.json({ error: "Fichier et titre requis" }, { status: 400 });
    }

    // Vérifier le type de fichier
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Format non supporté" }, { status: 400 });
    }

  // Créer le dossier public/uploads/meetings si nécessaire (servi statiquement)
  const uploadsDir = join(process.cwd(), "public", "uploads", "meetings");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (e) {
      // Le dossier existe déjà
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${sanitizedName}`;
  const filePath = join(uploadsDir, fileName);

    // Sauvegarder le fichier
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Créer l'entrée dans la base de données
    const db = prisma as any;
    const meeting = await db.meeting.create({
      data: {
        organizationId: organizationId,
        title,
        notes: "",
        status: "finalized",
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          // Chemin public servi par Next.js (depuis /public)
          filePath: `/uploads/meetings/${fileName}`,
          uploadedBy: userId || null
        }
      }
    });

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        fileName: file.name,
        fileUrl: `/uploads/meetings/${fileName}`,
        fileSize: file.size
      }
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'upload" },
      { status: 500 }
    );
  }
}
