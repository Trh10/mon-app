import Imap from 'imap';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  fromName?: string;
  to?: string;
  date: Date;
  snippet: string;
  unread: boolean;
  hasAttachments: boolean;
  labels?: string[];
  threadId?: string;
}

export interface EmailContent {
  id: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  date: Date;
  textContent: string;
  htmlContent: string;
  attachments: any[];
  headers?: any;
}

export class UniversalSmartClient {
  private email: string;
  private password: string;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  // 🌍 BASE DE DONNÉES COMPLÈTE des fournisseurs email mondiaux
  private getKnownProviders(): { [key: string]: any } {
    return {
      // 📧 GMAIL - Google
      'gmail.com': {
        imap: { host: 'imap.gmail.com', port: 993, tls: true },
        smtp: { host: 'smtp.gmail.com', port: 587, secure: false }
      },
      
      // 📧 MICROSOFT - Outlook/Hotmail/Live
      'outlook.com': {
        imap: { host: 'outlook.office365.com', port: 993, tls: true },
        smtp: { host: 'smtp.office365.com', port: 587, secure: false }
      },
      'hotmail.com': {
        imap: { host: 'outlook.office365.com', port: 993, tls: true },
        smtp: { host: 'smtp.office365.com', port: 587, secure: false }
      },
      'live.com': {
        imap: { host: 'outlook.office365.com', port: 993, tls: true },
        smtp: { host: 'smtp.office365.com', port: 587, secure: false }
      },
      'msn.com': {
        imap: { host: 'outlook.office365.com', port: 993, tls: true },
        smtp: { host: 'smtp.office365.com', port: 587, secure: false }
      },
      
      // 📧 YAHOO - Toutes variantes
      'yahoo.com': {
        imap: { host: 'imap.mail.yahoo.com', port: 993, tls: true },
        smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false }
      },
      'yahoo.fr': {
        imap: { host: 'imap.mail.yahoo.com', port: 993, tls: true },
        smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false }
      },
      'yahoo.co.uk': {
        imap: { host: 'imap.mail.yahoo.com', port: 993, tls: true },
        smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false }
      },
      'ymail.com': {
        imap: { host: 'imap.mail.yahoo.com', port: 993, tls: true },
        smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false }
      },
      
      // 📧 APPLE - iCloud
      'icloud.com': {
        imap: { host: 'imap.mail.me.com', port: 993, tls: true },
        smtp: { host: 'smtp.mail.me.com', port: 587, secure: false }
      },
      'me.com': {
        imap: { host: 'imap.mail.me.com', port: 993, tls: true },
        smtp: { host: 'smtp.mail.me.com', port: 587, secure: false }
      },
      'mac.com': {
        imap: { host: 'imap.mail.me.com', port: 993, tls: true },
        smtp: { host: 'smtp.mail.me.com', port: 587, secure: false }
      },
      
      // 📧 PROVIDERS FRANÇAIS
      'orange.fr': {
        imap: { host: 'imap.orange.fr', port: 993, tls: true },
        smtp: { host: 'smtp.orange.fr', port: 587, secure: false }
      },
      'wanadoo.fr': {
        imap: { host: 'imap.orange.fr', port: 993, tls: true },
        smtp: { host: 'smtp.orange.fr', port: 587, secure: false }
      },
      'free.fr': {
        imap: { host: 'imap.free.fr', port: 993, tls: true },
        smtp: { host: 'smtp.free.fr', port: 587, secure: false }
      },
      'sfr.fr': {
        imap: { host: 'imap.sfr.fr', port: 993, tls: true },
        smtp: { host: 'smtp.sfr.fr', port: 587, secure: false }
      },
      'laposte.net': {
        imap: { host: 'imap.laposte.net', port: 993, tls: true },
        smtp: { host: 'smtp.laposte.net', port: 587, secure: false }
      },
      
      // 📧 TON DOMAINE - INFOMANIAK
      'allinonerdc.com': {
        imap: { host: 'mail.infomaniak.com', port: 993, tls: true },
        smtp: { host: 'mail.infomaniak.com', port: 587, secure: false }
      },
      
      // 📧 PROVIDERS HÉBERGEURS POPULAIRES
      'infomaniak.com': {
        imap: { host: 'mail.infomaniak.com', port: 993, tls: true },
        smtp: { host: 'mail.infomaniak.com', port: 587, secure: false }
      },
      'ovh.com': {
        imap: { host: 'ssl0.ovh.net', port: 993, tls: true },
        smtp: { host: 'ssl0.ovh.net', port: 587, secure: false }
      },
      '1and1.com': {
        imap: { host: 'imap.1and1.com', port: 993, tls: true },
        smtp: { host: 'smtp.1and1.com', port: 587, secure: false }
      },
      'ionos.com': {
        imap: { host: 'imap.ionos.com', port: 993, tls: true },
        smtp: { host: 'smtp.ionos.com', port: 587, secure: false }
      }
    };
  }

  // 🔍 Auto-détection intelligente
  private async detectEmailProvider(domain: string) {
    const knownProviders = this.getKnownProviders();
    
    // 1. Vérifier si le domaine est dans notre base de données
    if (knownProviders[domain]) {
      console.log(`✅ Provider connu détecté: ${domain} - User: Trh10 - 2025-08-29 13:02:38`);
      return [knownProviders[domain]];
    }
    
    // 2. Essayer de détecter automatiquement via patterns
    console.log(`🔍 Provider inconnu: ${domain} - Détection automatique... - User: Trh10 - 2025-08-29 13:02:38`);
    return this.generateSmartConfigurations(domain);
  }

  // 🧠 Génération intelligente de configurations
  private generateSmartConfigurations(domain: string) {
    const configurations = [];
    
    // Patterns les plus courants dans l'ordre de probabilité
    const hostPatterns = [
      `mail.${domain}`,
      `imap.${domain}`,
      `smtp.${domain}`,
      `mx.${domain}`,
      `email.${domain}`,
      `webmail.${domain}`,
      domain, // Le domaine lui-même
      `m.${domain}`,
      `server.${domain}`,
      `mailserver.${domain}`,
      // Patterns spécifiques hébergeurs populaires
      `mail.infomaniak.com`, // Très courant en Suisse/France
      `ssl0.ovh.net`, // OVH France
      `mail.ovh.net`,
      `imap.gmail.com`, // Au cas où
      `outlook.office365.com` // Microsoft hébergé
    ];
    
    // Ports par ordre de fréquence
    const imapPorts = [993, 143]; // SSL first, puis STARTTLS
    const smtpPorts = [587, 465, 25]; // STARTTLS, SSL, puis non-sécurisé
    
    // Générer les configurations intelligemment
    for (const host of hostPatterns) {
      for (const imapPort of imapPorts) {
        for (const smtpPort of smtpPorts) {
          configurations.push({
            imap: { 
              host, 
              port: imapPort, 
              tls: imapPort === 993 || imapPort === 465
            },
            smtp: { 
              host, 
              port: smtpPort, 
              secure: smtpPort === 465,
              tls: smtpPort !== 25
            }
          });
        }
      }
    }
    
    return configurations;
  }

  // 🧪 Test de connexion optimisé
  private async testConfiguration(config: any, index: number, total: number): Promise<boolean> {
    return new Promise((resolve) => {
      console.log(`📡 Test ${index + 1}/${total}: ${config.imap.host}:${config.imap.port} - User: Trh10 - 2025-08-29 13:02:38`);
      
      const imap = new Imap({
        user: this.email,
        password: this.password,
        host: config.imap.host,
        port: config.imap.port,
        tls: config.imap.tls,
        tlsOptions: { 
          rejectUnauthorized: false,
          servername: config.imap.host
        },
        connTimeout: 4000, // 4 secondes
        authTimeout: 4000
      });

      const timeout = setTimeout(() => {
        try { imap.end(); } catch {}
        resolve(false);
      }, 6000); // 6 secondes max

      imap.once('ready', () => {
        clearTimeout(timeout);
        console.log(`✅ SUCCÈS: ${config.imap.host}:${config.imap.port} - User: Trh10 - 2025-08-29 13:02:38`);
        imap.end();
        resolve(true);
      });

  imap.once('error', (err: Error) => {
        clearTimeout(timeout);
        // Log seulement les erreurs intéressantes
        if (!err.message.includes('ENOTFOUND') && !err.message.includes('ETIMEDOUT')) {
          console.log(`❌ ${config.imap.host}: ${err.message} - User: Trh10`);
        }
        resolve(false);
      });

      try {
        imap.connect();
      } catch {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }

  // 🎯 Découverte automatique optimisée
  async discoverConfiguration() {
    const domain = this.email.split('@')[1];
    console.log(`🌍 Auto-découverte universelle pour: ${domain} - User: Trh10 - 2025-08-29 13:02:38`);
    
    const configurations = await this.detectEmailProvider(domain);
    console.log(`📊 ${configurations.length} configurations à tester - User: Trh10`);

    // Test avec limitation pour éviter les timeouts
    const maxTests = Math.min(configurations.length, 15); // Maximum 15 tests
    
    for (let i = 0; i < maxTests; i++) {
      const config = configurations[i];
      
      const success = await this.testConfiguration(config, i, maxTests);
      if (success) {
        console.log(`🎉 Configuration trouvée ! - User: Trh10 - 2025-08-29 13:02:38`);
        console.log(`📧 IMAP: ${config.imap.host}:${config.imap.port} - User: Trh10`);
        console.log(`📤 SMTP: ${config.smtp.host}:${config.smtp.port} - User: Trh10`);
        return config;
      }

      // Pause entre les tests pour éviter la surcharge
      if (i % 5 === 4) {
        console.log(`⏸️ Pause... ${i + 1}/${maxTests} testés - User: Trh10 - 2025-08-29 13:02:38`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    throw new Error(`Aucune configuration email trouvée pour ${domain} après ${maxTests} tests`);
  }

  async getEmails(folder = 'INBOX', limit = 20): Promise<EmailMessage[]> {
    const config = await this.discoverConfiguration();
    
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.email,
        password: this.password,
        host: config.imap.host,
        port: config.imap.port,
        tls: config.imap.tls,
        tlsOptions: { rejectUnauthorized: false }
      });

      const emails: EmailMessage[] = [];

      imap.once('ready', () => {
        console.log(`📬 Connexion IMAP réussie, ouverture boîte... - User: Trh10 - 2025-08-29 13:02:38`);
        
        imap.openBox(folder, true, (err, box) => {
          if (err) {
            console.error(`❌ Erreur ouverture boîte: ${err} - User: Trh10`);
            imap.end();
            return reject(err);
          }

          console.log(`📊 Boîte ${folder} ouverte: ${box.messages.total} messages - User: Trh10 - 2025-08-29 13:02:38`);

          if (box.messages.total === 0) {
            console.log(`📭 Aucun message dans la boîte - User: Trh10`);
            imap.end();
            return resolve([]);
          }

          const start = Math.max(1, box.messages.total - limit + 1);
          console.log(`📨 Récupération emails ${start} à ${box.messages.total} - User: Trh10`);
          
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
                  from: (() => { const f:any=(parsed as any).from; if(!f) return 'Expéditeur inconnu'; if(typeof f.text==='string') return f.text; if(Array.isArray(f.value)) return f.value.map((v: any)=>v.address||v.name).filter(Boolean).join(', ')||'Expéditeur inconnu'; return 'Expéditeur inconnu'; })(),
                  fromName: this.extractDisplayName(((parsed as any).from?.text) || ''),
                  date: parsed.date || new Date(),
                  snippet: (parsed.text || '').substring(0, 200),
                  unread: !attributes.flags.includes('\\Seen'),
                  hasAttachments: attributes.struct?.some((part: any) => 
                    part.disposition && part.disposition.type === 'attachment'
                  ) || false
                });
                
                console.log(`📧 Email ${seqno} traité: ${parsed.subject} - User: Trh10`);
              } catch (e) {
                console.error(`❌ Erreur parsing email: ${e} - User: Trh10`);
              }
            });
          });

          f.once('error', (err: unknown) => {
            console.error(`❌ Erreur fetch: ${err} - User: Trh10`);
            imap.end();
            reject(err);
          });

          f.once('end', () => {
            console.log(`✅ ${emails.length} emails récupérés avec succès - User: Trh10 - 2025-08-29 13:02:38`);
            imap.end();
            resolve(emails.reverse());
          });
        });
      });

  imap.once('error', (err: unknown) => {
        console.error(`❌ Erreur IMAP: ${err} - User: Trh10`);
        reject(err);
      });

      imap.connect();
    });
  }

  // ✅ NOUVELLE MÉTHODE pour lire par dossier
  async getEmailsByFolder(folder: string = 'INBOX', limit: number = 20): Promise<EmailMessage[]> {
    const config = await this.discoverConfiguration();
    
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.email,
        password: this.password,
        host: config.imap.host,
        port: config.imap.port,
        tls: config.imap.tls,
        tlsOptions: { rejectUnauthorized: false }
      });

      const emails: EmailMessage[] = [];

      imap.once('ready', () => {
        console.log(`📬 Connexion IMAP réussie pour dossier: ${folder} - User: Trh10 - 2025-08-29 13:02:38`);
        
        // ✅ MAPPAGE DES DOSSIERS
        const folderMap: { [key: string]: string[] } = {
          'inbox': ['INBOX'],
          'sent': ['Sent', 'SENT', 'Sent Items', 'Sent Messages', 'Éléments envoyés'],
          'drafts': ['Drafts', 'DRAFTS', 'Draft', 'Brouillons'],
          'spam': ['Spam', 'SPAM', 'Junk', 'JUNK'],
          'trash': ['Trash', 'TRASH', 'Deleted', 'Corbeille']
        };

        const possibleFolders = folderMap[folder.toLowerCase()] || [folder];
        
        // Essayer d'ouvrir le premier dossier qui existe
        this.tryOpenFolder(imap, possibleFolders, 0, (actualFolder) => {
          if (!actualFolder) {
            console.log(`📭 Dossier ${folder} vide ou inexistant - User: Trh10 - 2025-08-29 13:02:38`);
            imap.end();
            return resolve([]);
          }

          imap.openBox(actualFolder, true, (err, box) => {
            if (err) {
              console.error(`❌ Erreur ouverture ${actualFolder}: ${err} - User: Trh10`);
              imap.end();
              return resolve([]);
            }

            console.log(`📊 Dossier ${actualFolder}: ${box.messages.total} messages - User: Trh10 - 2025-08-29 13:02:38`);

            if (box.messages.total === 0) {
              console.log(`📭 Aucun message dans ${actualFolder} - User: Trh10`);
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
                    from: (() => { const f:any=(parsed as any).from; if(!f) return 'Expéditeur inconnu'; if(typeof f.text==='string') return f.text; if(Array.isArray(f.value)) return f.value.map((v: any)=>v.address||v.name).filter(Boolean).join(', ')||'Expéditeur inconnu'; return 'Expéditeur inconnu'; })(),
                    fromName: this.extractDisplayName(((parsed as any).from?.text) || ''),
                    date: parsed.date || new Date(),
                    snippet: (parsed.text || '').substring(0, 200),
                    unread: !attributes.flags.includes('\\Seen'),
                    hasAttachments: attributes.struct?.some((part: any) => 
                      part.disposition && part.disposition.type === 'attachment'
                    ) || false
                  });
                  
                  console.log(`📧 Email ${seqno} traité: ${parsed.subject} - User: Trh10`);
                } catch (e) {
                  console.error(`❌ Erreur parsing email: ${e} - User: Trh10`);
                }
              });
            });

            f.once('error', (err: unknown) => {
              console.error(`❌ Erreur fetch: ${err} - User: Trh10`);
              imap.end();
              resolve(emails);
            });

            f.once('end', () => {
              console.log(`✅ ${emails.length} emails récupérés de ${actualFolder} - User: Trh10 - 2025-08-29 13:02:38`);
              imap.end();
              resolve(emails.reverse());
            });
          });
        });
      });

      imap.once('error', (err: unknown) => {
        console.error(`❌ Erreur IMAP: ${err} - User: Trh10`);
        resolve([]);
      });

      imap.connect();
    });
  }

  // ✅ MÉTHODE helper pour essayer les dossiers
  private tryOpenFolder(imap: any, folderNames: string[], index: number, callback: (folder?: string) => void) {
    if (index >= folderNames.length) {
      return callback();
    }

    const folderName = folderNames[index];
    
    imap.getBoxes((err: any, boxes: any) => {
      if (err) {
        return this.tryOpenFolder(imap, folderNames, index + 1, callback);
      }

      if (boxes[folderName]) {
        console.log(`✅ Dossier trouvé: ${folderName} - User: Trh10 - 2025-08-29 13:02:38`);
        return callback(folderName);
      } else {
        console.log(`❌ Dossier non trouvé: ${folderName} - User: Trh10`);
        return this.tryOpenFolder(imap, folderNames, index + 1, callback);
      }
    });
  }

  // ✅ EXTRACTION INTELLIGENTE DU NOM
  private extractDisplayName(fromText: string): string {
    if (!fromText) return 'Expéditeur inconnu';
    
    const nameMatch = fromText.match(/^(.*?)\s*<.*>$/);
    if (nameMatch && nameMatch[1].trim()) {
      return nameMatch[1].trim().replace(/['"]/g, '');
    }
    
    const emailMatch = fromText.match(/([^@\s]+)@/);
    if (emailMatch) {
      const localPart = emailMatch[1];
      return localPart
        .split(/[._-]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    }
    
    return fromText;
  }

  // ✅ NOUVELLE MÉTHODE pour lire le contenu complet d'un email
  async getEmailContent(sequenceNumber: number): Promise<any> {
    console.log(`📧 Début getEmailContent - séquence: ${sequenceNumber} - User: Trh10 - 2025-08-29 13:02:38`);
    
    const config = await this.discoverConfiguration();
    
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.email,
        password: this.password,
        host: config.imap.host,
        port: config.imap.port,
        tls: config.imap.tls,
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
        console.log(`📧 IMAP connecté pour lecture détaillée - ${config.imap.host}:${config.imap.port} - User: Trh10`);
        
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            console.error(`❌ Erreur ouverture boîte pour lecture: ${err} - User: Trh10`);
            imap.end();
            return reject(err);
          }

          console.log(`📧 Boîte INBOX ouverte, ${box.messages.total} messages au total - User: Trh10`);

          // Vérifier que le numéro de séquence existe
          if (sequenceNumber > box.messages.total || sequenceNumber < 1) {
            console.error(`❌ Message ${sequenceNumber} n'existe pas (total: ${box.messages.total}) - User: Trh10`);
            imap.end();
            return reject(new Error(`Message ${sequenceNumber} n'existe pas (total: ${box.messages.total})`));
          }

          console.log(`📧 Lecture du message ${sequenceNumber}/${box.messages.total}... - User: Trh10`);

          // Récupérer le message complet
          const f = imap.seq.fetch(sequenceNumber, {
            bodies: '', // Corps complet
            struct: true
          });

          let emailContent = '';
          let attributes: any = {};

          f.on('message', (msg, seqno) => {
            console.log(`📧 Traitement message ${seqno} pour lecture complète... - User: Trh10`);
            
            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
                emailContent += chunk.toString('utf8');
              });
            });

            msg.on('attributes', (attrs) => {
              attributes = attrs;
            });

            msg.once('end', async () => {
              try {
                console.log(`📧 Parsing message ${seqno} complet... - User: Trh10`);
                  const parsed = await simpleParser(emailContent);
                
                const emailData = {
                  id: seqno.toString(),
                  subject: parsed.subject || 'Sans sujet',
                  from: (() => { const f:any=(parsed as any).from; if(!f) return 'Expéditeur inconnu'; if(typeof f.text==='string') return f.text; if(Array.isArray(f.value)) return f.value.map((v: any)=>v.address||v.name).filter(Boolean).join(', ')||'Expéditeur inconnu'; return 'Expéditeur inconnu'; })(),
                  to: (() => {
                    const toAny: any = (parsed as any).to;
                    if (!toAny) return 'Destinataire inconnu';
                    if (typeof toAny.text === 'string') return toAny.text;
                    if (Array.isArray(toAny.value)) {
                      return toAny.value.map((v: any) => v.address || v.name).filter(Boolean).join(', ') || 'Destinataire inconnu';
                    }
                    return 'Destinataire inconnu';
                  })(),
                  date: parsed.date || new Date(),
                  textContent: parsed.text || '',
                  htmlContent: parsed.html || '',
                  attachments: parsed.attachments?.map(att => ({
                    filename: att.filename,
                    contentType: att.contentType,
                    size: att.size
                  })) || []
                };
                
                console.log(`✅ Message ${seqno} lu avec succès - Sujet: ${emailData.subject} - User: Trh10 - 2025-08-29 13:02:38`);
                imap.end();
                resolve(emailData);
                
              } catch (e) {
                console.error(`❌ Erreur parsing message complet: ${e} - User: Trh10`);
                imap.end();
                reject(e);
              }
            });
          });

          f.once('error', (err: unknown) => {
            console.error(`❌ Erreur fetch message complet: ${err} - User: Trh10`);
            imap.end();
            reject(err);
          });
        });
      });

      imap.once('error', (err: unknown) => {
        console.error(`❌ Erreur connexion IMAP pour lecture: ${err} - User: Trh10`);
        reject(err);
      });

      imap.connect();
    });
  }

  // ✅ ENVOI D'EMAIL via SMTP
  async sendEmail(to: string, subject: string, content: string, isHtml: boolean = false): Promise<any> {
    const config = await this.discoverConfiguration();
    
    console.log(`✉️ Envoi email SMTP - To: ${to} - Subject: ${subject} - User: Trh10 - 2025-08-29 13:02:38`);
    
  const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure || false,
      auth: {
        user: this.email,
        pass: this.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions: any = {
      from: `Trh10 <${this.email}>`,
      to,
      subject
    };

    if (isHtml) {
      mailOptions.html = content;
      mailOptions.text = content.replace(/<[^>]*>/g, '');
    } else {
      mailOptions.text = content;
    }

    try {
      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Email SMTP envoyé - MessageID: ${result.messageId} - User: Trh10 - 2025-08-29 13:02:38`);
      return result;
    } catch (error) {
      console.error(`❌ Erreur envoi SMTP: ${error} - User: Trh10`);
      throw error;
    }
  }
}