import Imap from 'imap';
import { simpleParser, AddressObject } from 'mailparser';
import nodemailer from 'nodemailer';

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  fromName?: string;
  date: Date;
  snippet: string;
  unread: boolean;
  hasAttachments: boolean;
}

export class EmailClient {
  private imapConfig: any;
  private smtpConfig: any;

  constructor(config: {
    email: string;
    password: string;
    provider: 'gmail' | 'outlook' | 'yahoo' | 'custom';
    imapHost?: string;
    smtpHost?: string;
    imapPort?: number;
    smtpPort?: number;
  }) {
    if (config.provider === 'custom') {
      // Configuration personnalisée
      this.imapConfig = {
        user: config.email,
        password: config.password,
        host: config.imapHost || 'mail.allinonerdc.com',
        port: config.imapPort || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      };

      this.smtpConfig = {
        host: config.smtpHost || 'mail.allinonerdc.com',
        port: config.smtpPort || 587,
        secure: false,
        auth: {
          user: config.email,
          pass: config.password
        }
      };
    } else {
      // Providers standards
      const providers = {
        gmail: {
          imap: { host: 'imap.gmail.com', port: 993, tls: true },
          smtp: { host: 'smtp.gmail.com', port: 587, secure: false }
        },
        outlook: {
          imap: { host: 'outlook.office365.com', port: 993, tls: true },
          smtp: { host: 'smtp.office365.com', port: 587, secure: false }
        },
        yahoo: {
          imap: { host: 'imap.mail.yahoo.com', port: 993, tls: true },
          smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false }
        }
      };

      const providerConfig = providers[config.provider];

      this.imapConfig = {
        user: config.email,
        password: config.password,
        ...providerConfig.imap,
        tlsOptions: { rejectUnauthorized: false }
      };

      this.smtpConfig = {
        ...providerConfig.smtp,
        auth: {
          user: config.email,
          pass: config.password
        }
      };
    }
  }

  async getEmails(folder = 'INBOX', limit = 20): Promise<EmailMessage[]> {
    return new Promise((resolve, reject) => {
      const imap = new Imap(this.imapConfig);
      const emails: EmailMessage[] = [];

      imap.once('ready', () => {
        imap.openBox(folder, true, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          if (box.messages.total === 0) {
            imap.end();
            return resolve([]);
          }

          const start = Math.max(1, box.messages.total - limit + 1);
          const f = imap.seq.fetch(`${start}:*`, {
            bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID)',
            struct: true
          });

          f.on('message', (msg, seqno) => {
            let buffer = '';
            let attributes: any = {};

            msg.on('body', (stream) => {
              stream.on('data', (chunk) => buffer += chunk.toString('utf8'));
            });

            msg.on('attributes', (attrs) => {
              attributes = attrs;
            });

            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);
                
                emails.push({
                  id: seqno.toString(),
                  subject: parsed.subject || 'Sans sujet',
                  from: (parsed as any)?.from?.text || 'Expéditeur inconnu',
                  fromName: (() => {
                    const a: any = (parsed as any).from;
                    if (!a) return 'Inconnu';
                    if (typeof a.text === 'string') {
                      const m = a.text.match(/^(.*?)\s*<.*?>$/);
                      return (m?.[1]?.trim()) || a.text || 'Inconnu';
                    }
                    if (Array.isArray(a.value) && a.value.length) {
                      return a.value[0]?.name || a.value[0]?.address || 'Inconnu';
                    }
                    return 'Inconnu';
                  })(),
                  date: parsed.date || new Date(),
                  snippet: (parsed.text || '').substring(0, 200),
                  unread: !attributes.flags.includes('\\Seen'),
                  hasAttachments: attributes.struct?.some((part: any) => 
                    part.disposition && part.disposition.type === 'attachment'
                  ) || false
                });
              } catch (e) {
                console.error('Erreur parsing email:', e);
              }
            });
          });

          f.once('error', (err) => {
            imap.end();
            reject(err);
          });

          f.once('end', () => {
            imap.end();
            resolve(emails.reverse());
          });
        });
      });

      imap.once('error', (err: unknown) => {
        reject(err);
      });

      imap.connect();
    });
  }

  async sendEmail(to: string, subject: string, content: string): Promise<any> {
    const transporter = nodemailer.createTransport(this.smtpConfig as any);

    const mailOptions = {
      to,
      subject,
      text: content,
      html: content.replace(/\n/g, '<br>')
    };

    return await transporter.sendMail(mailOptions);
  }
}