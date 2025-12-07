import { NextRequest, NextResponse } from 'next/server';
import { unlink, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/db';
import { existsSync } from 'fs';

export const runtime = 'nodejs';

// Chemin du fichier JSON de fallback
const DATA_DIR = join(process.cwd(), '.data');
const MEETINGS_FILE = join(DATA_DIR, 'meetings.json');

// Lire les meetings depuis le fichier JSON
async function readMeetingsFromJson(): Promise<any[]> {
  try {
    if (existsSync(MEETINGS_FILE)) {
      const data = await readFile(MEETINGS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      // Gérer les deux formats: { meetings: [...] } ou [...]
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (parsed.meetings && Array.isArray(parsed.meetings)) {
        return parsed.meetings;
      }
    }
  } catch (e) {
    console.error('Error reading meetings JSON:', e);
  }
  return [];
}

// Sauvegarder les meetings dans le fichier JSON
async function saveMeetingsToJson(meetings: any[]): Promise<void> {
  // Sauvegarder avec la structure { meetings: [...] }
  await writeFile(MEETINGS_FILE, JSON.stringify({ meetings }, null, 2), 'utf-8');
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const meetingId = params.id;
  
  // Essayer d'abord avec le JSON fallback
  try {
    const jsonMeetings = await readMeetingsFromJson();
    const meeting = jsonMeetings.find(m => m.id === meetingId);
    if (meeting) {
      return NextResponse.json({ success: true, meeting });
    }
  } catch (e) {
    console.log('JSON fallback read failed, trying Prisma');
  }
  
  // Essayer avec Prisma
  try {
    const db = prisma as any;
    const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
    if (meeting) {
      return NextResponse.json({ success: true, meeting });
    }
  } catch (e) {
    console.error('Prisma read failed:', e);
  }
  
  return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const meetingId = params.id;
    console.log('[DELETE] Meeting ID received:', meetingId);
    
    let deleted = false;
    let fileUrl: string | null = null;

    // 1. Essayer de supprimer du JSON fallback
    try {
      const jsonMeetings = await readMeetingsFromJson();
      console.log('[DELETE] JSON meetings found:', jsonMeetings.length, 'IDs:', jsonMeetings.map(m => m.id));
      
      const meetingIndex = jsonMeetings.findIndex(m => m.id === meetingId);
      console.log('[DELETE] Meeting index found:', meetingIndex);
      
      if (meetingIndex !== -1) {
        const meeting = jsonMeetings[meetingIndex];
        fileUrl = meeting.fileUrl;
        
        // Retirer du tableau
        jsonMeetings.splice(meetingIndex, 1);
        await saveMeetingsToJson(jsonMeetings);
        deleted = true;
        console.log('[DELETE] Meeting deleted from JSON:', meetingId);
      }
    } catch (e) {
      console.log('[DELETE] JSON fallback delete failed:', e);
    }

    // 2. Essayer aussi avec Prisma (au cas où)
    if (!deleted) {
      try {
        const db = prisma as any;
        const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
        
        if (meeting) {
          const metadata = meeting.metadata && typeof meeting.metadata === 'object' ? (meeting.metadata as any) : {};
          fileUrl = metadata.filePath || null;
          
          await db.meeting.delete({ where: { id: meetingId } });
          deleted = true;
          console.log('Meeting deleted from Prisma:', meetingId);
        }
      } catch (e) {
        console.error('Prisma delete failed:', e);
      }
    }

    if (!deleted) {
      return NextResponse.json({ error: 'Réunion non trouvée' }, { status: 404 });
    }

    // 3. Supprimer le fichier physique
    if (fileUrl) {
      try {
        const fullPath = join(process.cwd(), 'public', fileUrl.replace(/^\/+/, ''));
        console.log('Deleting file:', fullPath);
        await unlink(fullPath);
        console.log('File deleted successfully');
      } catch (e) {
        console.log('File already deleted or not found');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete meeting error:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la suppression' }, { status: 500 });
  }
}
