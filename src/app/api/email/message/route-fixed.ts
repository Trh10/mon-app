import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ImapFlow } from 'imapflow';
import { google } from 'googleapis';
import { getAuthenticatedClient } from '@/lib/google-auth';

const ACCOUNTS_FILE = join(process.cwd(), 'data', 'email-accounts.json');

type AccountsData = { accounts: any[]; activeAccount: string | null };

function loadAccounts(): AccountsData {
  try {
    if (!existsSync(ACCOUNTS_FILE)) return { accounts: [], activeAccount: null };
    const data = readFileSync(ACCOUNTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return { accounts: [], activeAccount: null };
  }
}

// --- FONCTIONS GMAIL ---
function findBodyParts(parts: any[]): { text: string; html: string; attachments: any[] } {
  let text = '';
  let html = '';
  let attachments: any[] = [];

  for (const part of parts) {
    // Détecter les pièces jointes
    if (part.filename && part.filename.length > 0) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body?.size || 0,
        attachmentId: part.body?.attachmentId,
        contentId: part.headers?.find((h: any) => h.name === 'Content-ID')?.value,
        disposition: part.body?.disposition || 'attachment'
      });
    } else if (part.mimeType === 'text/plain' && part.body?.data) {
      text = part.body.data;
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      html = part.body.data;
    } else if (part.parts) {
      const nested = findBodyParts(part.parts);
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

    const data = loadAccounts();
    if (!data.activeAccount) {
      return NextResponse.json({ success: false, error: 'Aucun compte actif' }, { status: 404 });
    }
    
    const account = data.accounts.find(a => a.id === data.activeAccount);
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
          bodyData = findBodyParts(payload.parts);
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
          const messageData = client.fetchOne(uid, {
            envelope: true,
            bodyStructure: true,
            source: true,
            flags: true,
            bodyParts: ['TEXT', 'HEADER']
          }, { uid: true });

          const message = await messageData;
          
          if (!message) {
            throw new Error('Message non trouvé');
          }
          
          let textContent = '';
          let htmlContent = '';
          
          // Extraire le contenu du message
          if ((message as any).bodyParts) {
            for (const [key, part] of (message as any).bodyParts.entries()) {
              if (part && typeof part === 'string') {
                if (key.includes('TEXT') || key.includes('PLAIN')) {
                  textContent = part;
                } else if (key.includes('HTML')) {
                  htmlContent = part;
                }
              }
            }
          }
          
          // Si pas de contenu dans bodyParts, essayer source
          if (!textContent && !htmlContent && (message as any).source) {
            const source = (message as any).source.toString();
            
            // Extraction basique du contenu texte
            const textMatch = source.match(/Content-Type: text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\r?\nContent-Type|\r?\n\r?\n$)/i);
            if (textMatch) {
              textContent = textMatch[1].trim();
            }
            
            // Extraction basique du contenu HTML
            const htmlMatch = source.match(/Content-Type: text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\r?\nContent-Type|\r?\n\r?\n$)/i);
            if (htmlMatch) {
              htmlContent = htmlMatch[1].trim();
            }
            
            // Si toujours pas de contenu, prendre tout après les headers
            if (!textContent && !htmlContent) {
              const contentMatch = source.match(/\r?\n\r?\n([\s\S]+)$/);
              if (contentMatch) {
                textContent = contentMatch[1].trim();
              }
            }
          }

          const emailData = {
            id: messageId,
            uid: (message as any).uid,
            subject: (message as any).envelope?.subject || '(sans objet)',
            from: (message as any).envelope?.from?.[0]?.address || 'Expéditeur inconnu',
            fromName: (message as any).envelope?.from?.[0]?.name || (message as any).envelope?.from?.[0]?.address || '',
            to: (message as any).envelope?.to?.map((t: any) => t.address).join(', ') || '',
            date: (message as any).envelope?.date ? new Date((message as any).envelope.date).toISOString() : new Date().toISOString(),
            unread: !(message as any).flags?.has('\\Seen'),
            snippet: (textContent || htmlContent || '').substring(0, 150),
            hasAttachments: false, // TODO: Détecter les pièces jointes IMAP
            attachments: [], // TODO: Extraire les pièces jointes IMAP
            // Contenu unifié
            content: textContent || htmlContent || 'Contenu non disponible',
            textContent,
            htmlContent,
            // Compatibilité ExpandedEmailReader
            body: textContent || htmlContent || 'Contenu non disponible',
            bodyText: textContent,
            bodyHtml: htmlContent,
            provider: 'imap'
          };

          console.log('✅ IMAP message récupéré:', emailData.subject);
          return NextResponse.json({ success: true, email: emailData });
        } finally {
          lock.release();
        }
        
        await client.logout();
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
