import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ensureOrgAndUserFromCookie } from "@/lib/auth/sessionBridge";

export const runtime = "nodejs";

// Helper pour lire le fichier meetings local (fallback si pas de Prisma)
async function getMeetingsFile() {
  const filePath = join(process.cwd(), ".data", "meetings.json");
  try {
    const data = await readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { meetings: [] };
  }
}

async function saveMeetingsFile(data: any) {
  const dirPath = join(process.cwd(), ".data");
  const filePath = join(dirPath, "meetings.json");
  try {
    await mkdir(dirPath, { recursive: true });
  } catch {}
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    
    // Récupérer les infos utilisateur depuis le formulaire (envoyées par le client)
    const uploaderName = formData.get("uploaderName") as string || "Utilisateur";
    const companyCode = formData.get("companyCode") as string || "default";

    // Essayer d'abord la session classique
    let organizationId: number | undefined;
    let userId: number | undefined;
    
    try {
      const session = await getSession(req);
      organizationId = session.organizationId;
      userId = session.userId;
      
      if (!organizationId || !userId) {
        const bridged = await ensureOrgAndUserFromCookie(req);
        if (bridged) { 
          organizationId = bridged.organizationId; 
          userId = bridged.userId ?? undefined; 
        }
      }
    } catch (sessionError) {
      console.log("[meetings/upload] Session error, using fallback:", sessionError);
    }

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

    // Créer le dossier public/uploads/meetings si nécessaire
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

    const fileUrl = `/uploads/meetings/${fileName}`;

    // Essayer Prisma d'abord, sinon fallback sur fichier JSON
    let meetingId: string;
    
    if (organizationId) {
      try {
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
              filePath: fileUrl,
              uploadedBy: userId || null,
              uploaderName: uploaderName
            }
          }
        });
        meetingId = String(meeting.id);
      } catch (prismaError) {
        console.error("[meetings/upload] Prisma error, using file fallback:", prismaError);
        // Fallback sur fichier JSON
        const data = await getMeetingsFile();
        meetingId = `local-${timestamp}`;
        data.meetings.push({
          id: meetingId,
          title,
          fileName: file.name,
          fileUrl,
          fileSize: file.size,
          fileType: file.type,
          uploadedBy: uploaderName,
          companyCode,
          createdAt: new Date().toISOString()
        });
        await saveMeetingsFile(data);
      }
    } else {
      // Pas de session, utiliser le stockage fichier
      const data = await getMeetingsFile();
      meetingId = `local-${timestamp}`;
      data.meetings.push({
        id: meetingId,
        title,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        fileType: file.type,
        uploadedBy: uploaderName,
        companyCode,
        createdAt: new Date().toISOString()
      });
      await saveMeetingsFile(data);
    }

    return NextResponse.json({
      success: true,
      meeting: {
        id: meetingId,
        title,
        fileName: file.name,
        fileUrl,
        fileSize: file.size
      }
    });
  } catch (error: any) {
    console.error("[meetings/upload] Error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'upload" },
      { status: 500 }
    );
  }
}
