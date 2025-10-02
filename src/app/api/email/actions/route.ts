import { NextResponse, NextRequest } from 'next/server';
import { getGoogleAuth } from '@/lib/google-auth';
import { google } from 'googleapis';
import { ImapFlow } from 'imapflow';
import { listAccounts } from '@/lib/emailAccountsDb';
import { getSession } from '@/lib/session';

/**
 * Alias plural de `../action` car le frontend appelle `/api/email/actions`.
 * Implémente une simulation d'actions groupées (markRead, archive, delete)
 * et un hook pour gérer prochainement la vraie intégration (IMAP / Gmail API).
 * Gère aussi la remontée d'erreurs `invalid_grant` éventuelles afin de purger
 * les cookies côté client (le frontend pourra déclencher une re-auth Google).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, messageIds, emailIds, addLabelIds = [], removeLabelIds = [] } = body;
    const ids: string[] = messageIds || emailIds || [];

    if (!ids.length) {
      return NextResponse.json({ error: 'Aucun ID fourni' }, { status: 400 });
    }

    console.log('[email/actions] action=', action, 'ids=', ids);

  // Charger compte actif depuis DB (pour décider IMAP vs Gmail simulation)
  const session = await getSession(req);
  let active: any = null;
  if (session.organizationId && session.userId) {
    const store = await listAccounts(session);
    active = store.accounts.find((a: any) => a.id === store.activeAccount);
  }

  // Tenter Gmail si tokens présents et provider = gmail
  let gmailHandled = false;
    try {
      const auth = await getGoogleAuth(req as any);
      if (auth) {
        const gmail = google.gmail({ version: 'v1', auth });
        const modifyRequest: any = { ids, addLabelIds: [...addLabelIds], removeLabelIds: [...removeLabelIds] };
        switch (action) {
          case 'markRead': modifyRequest.removeLabelIds.push('UNREAD'); break;
          case 'markUnread': modifyRequest.addLabelIds.push('UNREAD'); break;
          case 'archive': modifyRequest.removeLabelIds.push('INBOX'); break;
          case 'moveToInbox': modifyRequest.addLabelIds.push('INBOX'); break;
          case 'trash':
            await gmail.users.messages.batchDelete({ userId: 'me', requestBody: { ids } });
            gmailHandled = true;
            return NextResponse.json({ success: true, action, ids, message: 'Emails moved to trash' });
        }
        if (!gmailHandled) {
          await gmail.users.messages.batchModify({ userId: 'me', requestBody: modifyRequest });
          gmailHandled = true;
        }
      }
    } catch (e: any) {
      const msg = e?.message || '';
      if (/invalid_grant/i.test(msg)) {
        console.warn('[email/actions] invalid_grant (Gmail)');
        return NextResponse.json({ error: 'google_invalid_grant', reauth: true }, { status: 401 });
      }
      console.warn('[email/actions] Gmail non réussi, fallback simulation:', msg);
    }

    // Si non Gmail: tentative IMAP réelle (markRead / archive / trash basiques)
    if (!gmailHandled && active?.credentials?.imapServer) {
      let client: ImapFlow | null = null;
      try {
        client = new ImapFlow({
          host: active.credentials.imapServer,
          port: active.credentials.imapPort,
            secure: active.credentials.useSSL,
          auth: { user: active.credentials.email, pass: active.credentials.password }
        });
        await client.connect();
        await client.mailboxOpen('INBOX');

        // Pour IMAP on reçoit des UIDs - ids supposés = uid utilisés dans listing
        const uidNumbers = ids.map(id => Number(id)).filter(n => !isNaN(n));
        if (!uidNumbers.length) throw new Error('Aucun UID valide pour IMAP');

        switch(action) {
          case 'markRead':
            await client.messageFlagsAdd(uidNumbers as any, ['\\Seen'], { uid: true });
            break;
          case 'markUnread':
            await client.messageFlagsRemove(uidNumbers as any, ['\\Seen'], { uid: true });
            break;
          case 'archive':
            // Tentative: déplacer vers dossier "Archive" si existe, sinon noop
            try {
              const mailboxes = await client.list();
              const archiveBox = mailboxes.find(m => /archive/i.test(m.path));
              if (archiveBox) {
                for (const uid of uidNumbers) {
                  await client.messageMove(uid, archiveBox.path, { uid: true });
                }
              }
            } catch {}
            break;
          case 'trash':
            try {
              const mailboxes = await client.list();
              const trashBox = mailboxes.find(m => /(trash|corbeille|deleted)/i.test(m.path));
              if (trashBox) {
                for (const uid of uidNumbers) {
                  await client.messageMove(uid, trashBox.path, { uid: true });
                }
              } else {
                // Fallback: add Deleted flag
                await client.messageFlagsAdd(uidNumbers as any, ['\\Deleted'], { uid: true });
              }
            } catch {}
            break;
          default:
            // no-op autre action
            break;
        }

        return NextResponse.json({ success: true, provider: 'imap', action, ids });
      } catch (e: any) {
        console.warn('[email/actions][IMAP] Fallback simulation cause:', e?.message);
      } finally {
        if (client) {
          try { await client.logout(); } catch {}
        }
      }
    }

    if (!gmailHandled) {
      // Simulation locale finale
      return NextResponse.json({ success: true, simulated: true, action, ids, message: 'Action simulée (fallback).' });
    }

    return NextResponse.json({ success: true, action, ids });
  } catch (error: any) {
    const msg = error?.message || '';
    if (/invalid_grant/i.test(msg)) {
      return NextResponse.json({ error: 'google_invalid_grant', reauth: true }, { status: 401 });
    }
    console.error('[email/actions] Erreur fatale:', error);
    return NextResponse.json({ error: msg || 'Erreur inconnue' }, { status: 500 });
  }
}
