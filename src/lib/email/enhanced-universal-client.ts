import Imap from 'imap';
import { simpleParser, Attachment as MailparserAttachment } from 'mailparser';
import nodemailer from 'nodemailer';
import dns from 'node:dns/promises';
import type { Email, Attachment } from '@/lib/types';
import { getGmailEmails } from './gmail-client';

type ServerConfig = {
  imap: { host: string; port: number; tls: boolean };
  smtp: { host: string; port: number; secure: boolean };
};

export class EnhancedUniversalEmailClient {
  private email: string;
  private password: string;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  private knownProviders: Record<string, ServerConfig> = {
    'gmail.com': { imap: { host: 'imap.gmail.com', port: 993, tls: true }, smtp: { host: 'smtp.gmail.com', port: 587, secure: false } },
    'outlook.com': { imap: { host: 'outlook.office365.com', port: 993, tls: true }, smtp: { host: 'smtp.office365.com', port: 587, secure: false } },
    'hotmail.com': { imap: { host: 'outlook.office365.com', port: 993, tls: true }, smtp: { host: 'smtp.office365.com', port: 587, secure: false } },
    'live.com': { imap: { host: 'outlook.office365.com', port: 993, tls: true }, smtp: { host: 'smtp.office365.com', port: 587, secure: false } },
    'yahoo.com': { imap: { host: 'imap.mail.yahoo.com', port: 993, tls: true }, smtp: { host: 'smtp.mail.yahoo.com', port: 465, secure: true } }
  };

  private mxMap(mxHost: string): ServerConfig | null {
    const h = mxHost.toLowerCase();
    if (h.includes('.google.com') || h.includes('googlemail.com')) {
      return { imap: { host: 'imap.gmail.com', port: 993, tls: true }, smtp: { host: 'smtp.gmail.com', port: 587, secure: false } };
    }
    if (h.includes('protection.outlook.com') || h.includes('.outlook.com') || h.includes('.office365.com') || h.includes('.microsoft.com')) {
      return { imap: { host: 'outlook.office365.com', port: 993, tls: true }, smtp: { host: 'smtp.office365.com', port: 587, secure: false } };
    }
    if (h.includes('.zoho.com')) {
      return { imap: { host: 'imappro.zoho.com', port: 993, tls: true }, smtp: { host: 'smtppro.zoho.com', port: 587, secure: false } };
    }
    if (h.includes('.titan.email')) {
      return { imap: { host: 'imap.titan.email', port: 993, tls: true }, smtp: { host: 'smtp.titan.email', port: 587, secure: false } };
    }
    if (h.includes('.ovh.')) {
      return { imap: { host: 'ssl0.ovh.net', port: 993, tls: true }, smtp: { host: 'ssl0.ovh.net', port: 587, secure: false } };
    }
    if (h.includes('ionos') || h.includes('1and1')) {
      return { imap: { host: 'imap.ionos.com', port: 993, tls: true }, smtp: { host: 'smtp.ionos.com', port: 587, secure: false } };
    }
    if (h.includes('gandi.net')) {
      return { imap: { host: 'mail.gandi.net', port: 993, tls: true }, smtp: { host: 'mail.gandi.net', port: 587, secure: false } };
    }
    if (h.includes('hostinger')) {
      return { imap: { host: 'imap.hostinger.com', port: 993, tls: true }, smtp: { host: 'smtp.hostinger.com', port: 587, secure: false } };
    }
    if (h.includes('privateemail.com')) {
      return { imap: { host: 'mail.privateemail.com', port: 993, tls: true }, smtp: { host: 'mail.privateemail.com', port: 587, secure: false } };
    }
    if (h.includes('infomaniak')) {
      return { imap: { host: 'imap.infomaniak.com', port: 993, tls: true }, smtp: { host: 'smtp.infomaniak.com', port: 587, secure: false } };
    }
    if (h.includes('yandex')) {
      return { imap: { host: 'imap.yandex.com', port: 993, tls: true }, smtp: { host: 'smtp.yandex.com', port: 465, secure: true } };
    }
    if (h.includes('secureserver.net')) {
      return { imap: { host: 'imap.secureserver.net', port: 993, tls: true }, smtp: { host: 'smtpout.secureserver.net', port: 587, secure: false } };
    }
    return null;
  }

  private async hostResolves(host: string): Promise<boolean> {
    try {
      const res = await dns.lookup(host, { all: true });
      return Array.isArray(res) ? res.length > 0 : !!res;
    } catch {
      return false;
    }
  }

  private async configsFromMx(domain: string): Promise<ServerConfig[] | null> {
    try {
      const mx = await dns.resolveMx(domain);
      if (!mx?.length) return null;
      mx.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
      const candidates: ServerConfig[] = [];
      for (const rec of mx) {
        const mapped = this.mxMap(rec.exchange);
        if (mapped) {
          if (await this.hostResolves(mapped.imap.host)) candidates.push(mapped);
        } else {
          const mxRoot = rec.exchange.replace(/^mx\d*\./i, '').replace(/^mail\./i, '');
          const tryHosts = [`imap.${domain}`, `mail.${domain}`, `imap.${mxRoot}`, `mail.${mxRoot}`];
          for (const h of tryHosts) {
            if (await this.hostResolves(h)) {
              candidates.push({ imap: { host: h, port: 993, tls: true }, smtp: { host: `smtp.${domain}`, port: 587, secure: false } });
              break;
            }
          }
        }
        if (candidates.length >= 3) break;
      }
      return candidates.length ? candidates : null;
    } catch {
      return null;
    }
  }

  private async fallbackGuesses(domain: string): Promise<ServerConfig[]> {
    const guesses = [
      { imapHost: `mail.${domain}`, smtpHost: `smtp.${domain}` },
      { imapHost: `imap.${domain}`, smtpHost: `smtp.${domain}` },
      { imapHost: domain, smtpHost: `smtp.${domain}` }
    ];
    const out: ServerConfig[] = [];
    for (const g of guesses) {
      if (await this.hostResolves(g.imapHost)) {
        out.push({ imap: { host: g.imapHost, port: 993, tls: true }, smtp: { host: g.smtpHost, port: 587, secure: false } });
      }
      if (out.length >= 2) break;
    }
    return out;
  }

  private async discoverServerConfig(): Promise<ServerConfig> {
    const domain = this.email.split('@')[1]?.toLowerCase() || '';
    const known = this.knownProviders[domain];
    if (known) {
      if (await this.hostResolves(known.imap.host)) return known;
      throw new Error(`Le serveur IMAP connu (${known.imap.host}) ne répond pas pour ${domain}.`);
    }
    const mxCandidates = await this.configsFromMx(domain);
    if (mxCandidates?.length) {
      for (let i = 0; i < mxCandidates.length; i++) {
        const ok = await this.testImapConfig(mxCandidates[i], i, mxCandidates.length);
        if (ok) return mxCandidates[i];
      }
    }
    const fallbacks = await this.fallbackGuesses(domain);
    if (fallbacks.length) {
      for (let i = 0; i < fallbacks.length; i++) {
        const ok = await this.testImapConfig(fallbacks[i], i, fallbacks.length);
        if (ok) return fallbacks[i];
      }
    }
    throw new Error(`Aucune configuration IMAP/SMTP trouvée pour ${domain} (MX et résolutions DNS infructueuses)`);
  }

  private async testImapConfig(config: ServerConfig, index: number, total: number): Promise<boolean> {
    return new Promise((resolve) => {
      const h = `${config.imap.host}:${config.imap.port}`;
      const imap = new Imap({
        user: this.email,
        password: this.password,
        host: config.imap.host,
        port: config.imap.port,
        tls: config.imap.tls,
        tlsOptions: { rejectUnauthorized: false, servername: config.imap.host },
        connTimeout: 3000,
        authTimeout: 3000
      });
      const timeout = setTimeout(() => { try { imap.end(); } catch {} resolve(false); }, 6000);
      imap.once('ready', () => { clearTimeout(timeout); imap.end(); resolve(true); });
      imap.once('error', () => { clearTimeout(timeout); resolve(false); });
      try { imap.connect(); } catch { clearTimeout(timeout); resolve(false); }
    });
  }

  private async resolveConfig(forced?: ServerConfig): Promise<ServerConfig> {
    if (forced) return forced;
    return await this.discoverServerConfig();
  }

  /**
   * IMAP: on récupère HEADER + BODY[] (corps complet) pour parser HTML/TEXT/attachments.
   */
  async getEmails(folder = 'INBOX', limit = 20, forcedConfig?: ServerConfig): Promise<Email[]> {
    const config = await this.resolveConfig(forcedConfig);

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.email,
        password: this.password,
        host: config.imap.host,
        port: config.imap.port,
        tls: config.imap.tls,
        tlsOptions: { rejectUnauthorized: false, servername: config.imap.host }
      });

      const emails: Email[] = [];

      imap.once('ready', () => {
        imap.openBox(folder, true, (err, box) => {
          if (err) { imap.end(); return reject(err); }
          if (box.messages.total === 0) { imap.end(); return resolve([]); }

          const start = Math.max(1, box.messages.total - limit + 1);
          const f = imap.seq.fetch(`${start}:*`, {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)', 'BODY[]'],
            struct: true
          });

          f.on('message', (msg) => {
            let headerBuffer = '';
            const bodyChunks: Buffer[] = [];
            let attributes: any = {};

            msg.on('body', (stream, info: any) => {
              const which = String(info?.which || '').toUpperCase();
              stream.on('data', (chunk: Buffer) => {
                if (which.startsWith('HEADER')) {
                  headerBuffer += chunk.toString('utf8');
                } else {
                  bodyChunks.push(chunk); // conserve en binaire
                }
              });
            });

            msg.on('attributes', (attrs) => { attributes = attrs; });

            msg.once('end', async () => {
              try {
                // Parse header rapide
                let subject = 'Sans sujet';
                let fromText = 'Expéditeur inconnu';
                try {
                  const headerParsed = await simpleParser(headerBuffer);
                  subject = headerParsed.subject || subject;
                  fromText = headerParsed.from?.text || fromText;
                } catch {}

                let fromName: string | undefined;
                const m = fromText.match(/^(.*?)\s*<.*?>$/);
                fromName = m?.[1]?.trim() || undefined;

                // Parse message complet
                const fullBuffer = Buffer.concat(bodyChunks);
                let body = '';
                let date: Date = new Date();
                let atts: Attachment[] = [];
                let hasAttachments = false;

                if (fullBuffer.length) {
                  const parsed = await simpleParser(fullBuffer);
                  date = parsed.date || date;

                  if (typeof parsed.html === 'string' && parsed.html) {
                    body = parsed.html;
                  } else if (typeof parsed.textAsHtml === 'string' && parsed.textAsHtml) {
                    body = parsed.textAsHtml;
                  } else if (typeof parsed.text === 'string' && parsed.text) {
                    body = parsed.text;
                  } else {
                    body = '';
                  }

                  if (Array.isArray(parsed.attachments) && parsed.attachments.length) {
                    hasAttachments = true;
                    atts = parsed.attachments.map((a: MailparserAttachment) => ({
                      filename: a.filename || 'attachment',
                      contentType: a.contentType || 'application/octet-stream',
                      size: a.size || 0,
                      contentId: a.cid
                    }));
                  }
                }

                const uid = attributes?.uid ? String(attributes.uid) : String(attributes?.seqno || '0');
                const flags: string[] = Array.isArray(attributes?.flags) ? attributes.flags : [];
                const unread = !flags.includes('\\Seen');

                emails.push({
                  id: uid,
                  subject,
                  from: fromText,
                  fromName: fromName || fromText.split('<')[0]?.trim() || 'Inconnu',
                  date: (date instanceof Date ? date.toISOString() : new Date(date).toISOString()),
                  snippet: body.replace(/<[^>]+>/g, '').slice(0, 200),
                  unread,
                  hasAttachments,
                  body,
                  attachments: atts,
                  priority: 'normal',
                  read: !unread,
                });
              } catch (e) {
                // ignore ce message
              }
            });
          });

          f.once('error', (err) => { imap.end(); reject(err); });
          f.once('end', () => { imap.end(); resolve(emails.reverse()); });
        });
      });

      imap.once('error', (err) => { reject(err); });

      imap.connect();
    });
  }

  async sendEmail(to: string, subject: string, content: string, forcedConfig?: ServerConfig): Promise<any> {
    const config = await this.resolveConfig(forcedConfig);
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: this.email, pass: this.password },
      tls: { rejectUnauthorized: false }
    });
    return await transporter.sendMail({ from: this.email, to, subject, text: content, html: content.replace(/\n/g, '<br>') });
  }
}

/* ====== API-facing helper ====== */
function detectProvider(email: string | undefined) {
  const e = (email || '').toLowerCase();
  if (e.endsWith('@gmail.com')) return 'gmail';
  if (/@(outlook|hotmail|live)\.com$/.test(e)) return 'outlook';
  if (e.endsWith('@yahoo.com')) return 'yahoo';
  return 'imap';
}

export async function universalConnect(payload: any) {
  try {
    const email = payload?.email;
    const password = payload?.password || payload?.appPassword || payload?.pass;
    const accessToken = payload?.accessToken;
    const folder = (payload?.folder || 'INBOX') as string;
    const limit = payload?.limit || 20;

    if (!email) return { ok: false, error: 'Email requis', code: 'MISSING_EMAIL' };

    const provider = (payload?.provider || detectProvider(email)) as string;

    // Gmail OAuth -> le client renvoie déjà Email[] avec body rempli
    if (provider === 'gmail' && !password && accessToken) {
      const emails = await getGmailEmails(accessToken, limit, folder);
      const stats = { total: emails.length, unread: emails.filter(e => e.unread).length, folders: [folder], provider };
      return { ok: true, provider, emails, stats };
    }

    // IMAP classique
    if (!password) {
      if (provider === 'gmail') {
        return {
          ok: false, error: 'AUTH_FAILED', code: 'AUTH_FAILED',
          message: "Pour Gmail, utilisez un mot de passe d'application ou la connexion sécurisée Google (OAuth)."
        };
      }
      return { ok: false, error: 'Mot de passe requis', code: 'MISSING_PASSWORD' };
    }

    // Config forcée optionnelle
    let forcedConfig: ServerConfig | undefined;
    if (payload?.imapHost) {
      forcedConfig = {
        imap: { host: payload.imapHost, port: Number(payload.imapPort || 993), tls: payload.imapTls ?? true },
        smtp: { host: payload.smtpHost || payload.imapHost, port: Number(payload.smtpPort || 587), secure: payload.smtpSecure ?? false }
      };
    }

    const client = new EnhancedUniversalEmailClient(email, password);
    const emails = await client.getEmails(folder, limit, forcedConfig);

    const stats = { total: emails.length, unread: emails.filter(e => e.unread).length, folders: [folder], provider };
    return { ok: true, provider, emails, stats };
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    let code = 'IMAP_ERROR';
    let error = 'Erreur IMAP';
    let message = msg;

    if (/AUTHENTICATIONFAILED|Invalid credentials|LOGIN failed|AUTH/i.test(msg)) {
      code = 'AUTH_FAILED'; error = 'AUTH_FAILED'; message = 'Identifiants incorrects';
    } else if (/ENOTFOUND|ECONNREFUSED|timeout|timed out/i.test(msg)) {
      code = 'CONNECTION_FAILED'; error = 'CONNECTION_FAILED'; message = 'Serveur injoignable ou trop lent. Vérifiez l’hôte/port IMAP et la connectivité réseau.';
    } else if (/Aucune configuration IMAP\/SMTP trouvée/i.test(msg)) {
      code = 'CONFIG_NOT_FOUND'; error = 'CONFIG_NOT_FOUND'; message = msg;
    }

    return { ok: false, error, message, code };
  }
}

export default universalConnect;