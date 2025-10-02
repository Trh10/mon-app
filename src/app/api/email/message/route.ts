export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { google } from 'googleapis';
import { simpleParser, Attachment } from 'mailparser';
import { getAuthenticatedClient } from '@/lib/google-auth';
import { listAccounts } from '@/lib/emailAccountsDb';
import { getSession } from '@/lib/session';
type AccountsData = { accounts: any[]; activeAccount: string | null };

// --- FONCTIONS GMAIL ---
async function findBodyParts(parts: any[], gmail: any, messageId: string): Promise<{ text: string; html: string; attachments: any[] }> {
  let text = '';
  let html = '';
  let attachments: any[] = [];

  for (const part of parts) {
    // Détecter les pièces jointes
    if (part.filename && part.filename.length > 0) {
      let content = '';
      
      // Si c'est un attachement avec attachmentId, télécharger le contenu
      if (part.body?.attachmentId) {
        try {
          const attachmentResponse = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: messageId,
            id: part.body.attachmentId,
          });
          
          if (attachmentResponse.data?.data) {
            content = attachmentResponse.data.data;
          }
        } catch (error) {
          console.log('❌ Erreur téléchargement attachement:', part.filename, error);
        }
      } else if (part.body?.data) {
        content = part.body.data;
      }
      
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body?.size || 0,
        attachmentId: part.body?.attachmentId,
        contentId: part.headers?.find((h: any) => h.name === 'Content-ID')?.value,
        disposition: part.body?.disposition || 'attachment',
        content: content // Contenu en base64
      });
    } else if (part.mimeType === 'text/plain' && part.body?.data) {
      text = part.body.data;
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      html = part.body.data;
    } else if (part.parts) {
      const nested = await findBodyParts(part.parts, gmail, messageId);
      if (nested.text) text = nested.text;
      if (nested.html) html = nested.html;
      attachments = attachments.concat(nested.attachments);
    }
  }
  return { text, html, attachments };
}

function decodeBase64Url(data: string): string {
  if (!data) return '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

const getHeader = (headers: any[], name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('id');
    
    if (!messageId) {
      return NextResponse.json({ success: false, error: 'ID du message requis' }, { status: 400 });
    }

    const session = await getSession(request);
    if (!session.organizationId || !session.userId) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }
    const dataStore = await listAccounts(session);
    if (!dataStore.activeAccount) {
      return NextResponse.json({ success: false, error: 'Aucun compte actif' }, { status: 404 });
    }
    const account = (dataStore.accounts as any[]).find(a => a.id === dataStore.activeAccount);
    if (!account) {
      return NextResponse.json({ success: false, error: 'Compte actif non trouvé' }, { status: 404 });
    }

    // === GMAIL OAuth ===
    if (account.provider?.id === 'gmail' && account.credentials?.oauth === 'google') {
      try {
        console.log('📧 Récupération Gmail message:', messageId);
        const auth = getAuthenticatedClient();
        const gmail = google.gmail({ version: 'v1', auth });
        
        const msgResponse = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full',
        });

        const { payload, internalDate } = msgResponse.data;
        if (!payload || !payload.headers) {
          throw new Error("La structure de l'email est invalide.");
        }

        let bodyData: { text: string; html: string; attachments: any[] } = { text: '', html: '', attachments: [] };
        if (payload.parts) {
          bodyData = await findBodyParts(payload.parts, gmail, messageId);
        } else if (payload.body?.data) {
          if (payload.mimeType === 'text/plain') {
            bodyData.text = payload.body.data;
          } else if (payload.mimeType === 'text/html') {
            bodyData.html = payload.body.data;
          }
        }

        const textContent = decodeBase64Url(bodyData.text);
        const htmlContent = decodeBase64Url(bodyData.html);
        const attachments = bodyData.attachments;

        const email = {
          id: msgResponse.data.id,
          subject: getHeader(payload.headers, 'Subject') || '(sans objet)',
          from: getHeader(payload.headers, 'From'),
          fromName: getHeader(payload.headers, 'From'),
          to: getHeader(payload.headers, 'To'),
          date: internalDate ? new Date(parseInt(internalDate, 10)).toISOString() : new Date().toISOString(),
          unread: msgResponse.data.labelIds?.includes('UNREAD') || false,
          snippet: msgResponse.data.snippet || '',
          hasAttachments: attachments.length > 0,
          attachments,
          // Contenu unifié
          content: textContent || htmlContent || 'Contenu non disponible',
          textContent,
          htmlContent,
          // Compatibilité ExpandedEmailReader
          body: textContent || htmlContent || 'Contenu non disponible',
          bodyText: textContent,
          bodyHtml: htmlContent,
          provider: 'gmail'
        };

        console.log('✅ Gmail message récupéré:', email.subject);
        return NextResponse.json({ success: true, email });
      } catch (e: any) {
        console.log('❌ Erreur Gmail API:', e.message);
        return NextResponse.json({ 
          success: false, 
          error: `Erreur Gmail: ${e.message}` 
        }, { status: 500 });
      }
    }
    
    // === IMAP ===
    else if (account.credentials?.email || account.email) {
      const email = account.credentials?.email || account.email;
      const password = account.credentials?.password;
      const imapHost = account.credentials?.imapServer;
      const imapPort = account.credentials?.imapPort || 993;
      const secure = account.credentials?.useSSL !== false;
      
      if (!email || !password || !imapHost) {
        return NextResponse.json({ success: false, error: 'Identifiants IMAP manquants' }, { status: 400 });
      }

      console.log('📧 Récupération IMAP message:', messageId);
      const client = new ImapFlow({
        host: imapHost,
        port: imapPort,
        secure,
        auth: { user: email, pass: password },
        logger: false
      });

      try {
        await client.connect();
        const lock = await client.getMailboxLock('INBOX');
        
        try {
          const uid = parseInt(messageId);
          // Récupération brute + entête via source pour un parse complet et rapide
          const msg = await client.fetchOne(uid, { envelope: true, source: true, flags: true }, { uid: true });
          if (!msg) throw new Error('Message non trouvé');

          const parsed = await simpleParser((msg as any).source);

          const attachments = (parsed.attachments || []).map((att: Attachment) => ({
            filename: att.filename || 'fichier',
            mimeType: att.contentType,
            size: att.size || (att.content ? (att.content as Buffer).length : 0),
            contentId: att.cid,
            disposition: att.contentDisposition || 'attachment',
            content: Buffer.isBuffer(att.content) ? (att.content as Buffer).toString('base64') : ''
          }));

          const emailData = {
            id: messageId,
            uid: (msg as any).uid,
            subject: (msg as any).envelope?.subject || '(sans objet)',
            from: (msg as any).envelope?.from?.[0]?.address || 'Expéditeur inconnu',
            fromName: (msg as any).envelope?.from?.[0]?.name || (msg as any).envelope?.from?.[0]?.address || '',
            to: (msg as any).envelope?.to?.map((t: any) => t.address).join(', ') || '',
            date: (msg as any).envelope?.date ? new Date((msg as any).envelope.date).toISOString() : new Date().toISOString(),
            unread: !(msg as any).flags?.has('\\Seen'),
            snippet: (parsed.text || parsed.html || '').substring(0, 150),
            hasAttachments: attachments.length > 0,
            attachments,
            // Contenu unifié
            content: parsed.text || parsed.html || 'Contenu non disponible',
            textContent: parsed.text || '',
            htmlContent: parsed.html || '',
            // Compatibilité ExpandedEmailReader
            body: parsed.text || parsed.html || 'Contenu non disponible',
            bodyText: parsed.text || '',
            bodyHtml: parsed.html || '',
            provider: 'imap'
          };

          console.log('✅ IMAP message récupéré:', emailData.subject);
          return NextResponse.json({ success: true, email: emailData });
        } finally {
          lock.release();
          await client.logout();
        }
      } catch (e: any) {
        console.log('❌ Erreur IMAP:', e.message);
        return NextResponse.json({ 
          success: false, 
          error: `Erreur IMAP: ${e.message}` 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Type de compte non supporté' 
    }, { status: 400 });

  } catch (error: any) {
    console.log('❌ Erreur générale:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erreur lors de la récupération du message' 
    }, { status: 500 });
  }
}
