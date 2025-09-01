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

export interface EmailFolder {
  id: string;
  name: string;
  count: number;
  unreadCount: number;
}

export class UniversalCompleteClient {
  private email: string;
  private password: string;
  private accessToken?: string;
  private refreshToken?: string;
  private provider: 'gmail' | 'outlook' | 'imap' = 'imap';
  private config: any = null;

  constructor(email: string, password: string, tokens?: { accessToken?: string; refreshToken?: string }) {
    this.email = email;
    this.password = password;
    this.accessToken = tokens?.accessToken;
    this.refreshToken = tokens?.refreshToken;
  }

  // 🌍 BASE DE DONNÉES des providers (même que avant)
  private getKnownProviders(): { [key: string]: any } {
    return {
      'gmail.com': {
        type: 'gmail',
        imap: { host: 'imap.gmail.com', port: 993, tls: true },
        smtp: { host: 'smtp.gmail.com', port: 587, secure: false }
      },
      'outlook.com': {
        type: 'outlook',
        imap: { host: 'outlook.office365.com', port: 993, tls: true },
        smtp: { host: 'smtp.office365.com', port: 587, secure: false }
      },
      'hotmail.com': {
        type: 'outlook',
        imap: { host: 'outlook.office365.com', port: 993, tls: true },
        smtp: { host: 'smtp.office365.com', port: 587, secure: false }
      },
      'yahoo.com': {
        type: 'imap',
        imap: { host: 'imap.mail.yahoo.com', port: 993, tls: true },
        smtp: { host: 'smtp.mail.yahoo.com', port: 587, secure: false }
      },
      'allinonerdc.com': {
        type: 'imap',
        imap: { host: 'mail.infomaniak.com', port: 993, tls: true },
        smtp: { host: 'mail.infomaniak.com', port: 587, secure: false }
      },
      'infomaniak.com': {
        type: 'imap',
        imap: { host: 'mail.infomaniak.com', port: 993, tls: true },
        smtp: { host: 'mail.infomaniak.com', port: 587, secure: false }
      }
    };
  }

  // 🔍 Auto-détection (même que avant)
  async discoverConfiguration() {
    const domain = this.email.split('@')[1];
    const knownProviders = this.getKnownProviders();
    
    console.log(`🌍 Auto-découverte universelle pour: ${domain} - User: Trh10 - 2025-08-29 12:06:49`);
    
    if (knownProviders[domain]) {
      console.log(`✅ Provider connu: ${domain} (${knownProviders[domain].type})`);
      this.provider = knownProviders[domain].type;
      this.config = knownProviders[domain];
      return knownProviders[domain];
    }
    
    throw new Error(`Provider ${domain} non supporté`);
  }

  // 📧 RÉCUPÉRATION DES EMAILS - AVEC SUPPORT DOSSIERS
  async getEmails(folder = 'INBOX', limit = 50): Promise<EmailMessage[]> {
    if (!this.config) {
      await this.discoverConfiguration();
    }

    console.log(`📧 Récupération emails IMAP - Folder: ${folder} - Limit: ${limit} - User: Trh10 - 2025-08-29 12:06:49`);

    return this.getImapEmails(folder, limit);
  }

  // 📧 IMAP avec support des dossiers
  private async getImapEmails(folder: string, limit: number): Promise<EmailMessage[]> {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.email,
        password: this.password,
        host: this.config.imap.host,
        port: this.config.imap.port,
        tls: this.config.imap.tls,
        tlsOptions: { rejectUnauthorized: false }
      });

      const emails: EmailMessage[] = [];

      imap.once('ready', () => {
        console.log(`📬 Connexion IMAP réussie: ${this.config.imap.host} - Dossier: ${folder}`);
        
        // 🗂️ MAPPAGE DES DOSSIERS IMAP
        const folderMap: { [key: string]: string[] } = {
          'INBOX': ['INBOX'],
          'inbox': ['INBOX'],
          'sent': ['Sent', 'SENT', 'Sent Items', 'Sent Messages', 'Éléments envoyés', 'Messages envoyés'],
          'drafts': ['Drafts', 'DRAFTS', 'Draft', 'Brouillons'],
          'spam': ['Spam', 'SPAM', 'Junk', 'JUNK', 'Courrier indésirable'],
          'trash': ['Trash', 'TRASH', 'Deleted', 'DELETED', 'Corbeille', 'Éléments supprimés'],
          'archive': ['Archive', 'ARCHIVE', 'All Mail', 'Tous les messages']
        };

        const possibleFolders = folderMap[folder.toLowerCase()] || [folder];
        
        // Essayer les dossiers possibles
        this.tryOpenFolder(imap, possibleFolders, 0, (err, actualFolder) => {
          if (err) {
            console.error(`❌ Impossible d'ouvrir le dossier ${folder}:`, err.message);
            imap.end();
            // Retourner un tableau vide au lieu d'une erreur pour les dossiers vides
            return resolve([]);
          }

          console.log(`📊 Dossier ${actualFolder} ouvert avec succès`);

          imap.openBox(actualFolder, true, (err, box) => {
            if (err) {
              console.error(`❌ Erreur ouverture boîte ${actualFolder}:`, err);
              imap.end();
              return resolve([]);
            }

            console.log(`📊 Boîte ${actualFolder}: ${box.messages.total} messages`);

            if (box.messages.total === 0) {
              console.log(`📭 Aucun message dans ${actualFolder}`);
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
                    from: parsed.from?.text || 'Expéditeur inconnu',
                    fromName: this.extractDisplayName(parsed.from?.text || ''),
                    to: parsed.to?.text || '',
                    date: parsed.date || new Date(),
                    snippet: (parsed.text || '').substring(0, 200),
                    unread: !attributes.flags.includes('\\Seen'),
                    hasAttachments: attributes.struct?.some((part: any) => 
                      part.disposition && part.disposition.type === 'attachment'
                    ) || false,
                    threadId: seqno.toString()
                  });
                } catch (e) {
                  console.error('❌ Erreur parsing email:', e);
                }
              });
            });

            f.once('error', (err) => {
              console.error(`❌ Erreur fetch ${actualFolder}:`, err);
              imap.end();
              resolve(emails); // Retourner les emails déjà récupérés
            });

            f.once('end', () => {
              console.log(`✅ ${emails.length} emails IMAP récupérés de ${actualFolder}`);
              imap.end();
              resolve(emails.reverse());
            });
          });
        });
      });

      imap.once('error', (err) => {
        console.error(`❌ Erreur connexion IMAP:`, err);
        resolve([]); // Retourner un tableau vide au lieu d'une erreur
      });

      imap.connect();
    });
  }

  // 🗂️ Fonction pour essayer d'ouvrir un dossier parmi plusieurs possibilités
  private tryOpenFolder(imap: any, folderNames: string[], index: number, callback: (err: any, folder?: string) => void) {
    if (index >= folderNames.length) {
      return callback(new Error('Aucun dossier trouvé'));
    }

    const folderName = folderNames[index];
    
    // Vérifier si le dossier existe
    imap.getBoxes((err: any, boxes: any) => {
      if (err) {
        return this.tryOpenFolder(imap, folderNames, index + 1, callback);
      }

      // Chercher le dossier (insensible à la casse)
      const foundFolder = this.findFolderInBoxes(boxes, folderName);
      
      if (foundFolder) {
        console.log(`✅ Dossier trouvé: ${foundFolder} (recherché: ${folderName})`);
        return callback(null, foundFolder);
      } else {
        console.log(`❌ Dossier non trouvé: ${folderName}`);
        return this.tryOpenFolder(imap, folderNames, index + 1, callback);
      }
    });
  }

  // 🔍 Fonction pour chercher un dossier dans la liste des boîtes
  private findFolderInBoxes(boxes: any, searchName: string): string | null {
    const searchLower = searchName.toLowerCase();
    
    for (const boxName in boxes) {
      if (boxName.toLowerCase() === searchLower) {
        return boxName;
      }
    }
    
    // Chercher dans les sous-dossiers
    for (const boxName in boxes) {
      if (boxes[boxName].children) {
        const found = this.findFolderInBoxes(boxes[boxName].children, searchName);
        if (found) {
          return `${boxName}${boxes[boxName].delimiter}${found}`;
        }
      }
    }
    
    return null;
  }

  // ✨ EXTRACTION INTELLIGENTE DU NOM D'AFFICHAGE
  private extractDisplayName(fromText: string): string {
    if (!fromText) return 'Expéditeur inconnu';
    
    // Format: "Nom Prénom <email@domain.com>"
    const nameMatch = fromText.match(/^(.*?)\s*<.*>$/);
    if (nameMatch && nameMatch[1].trim()) {
      return nameMatch[1].trim().replace(/['"]/g, '');
    }
    
    // Format: "email@domain.com"
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

  // 📧 LECTURE EMAIL COMPLET
  async getEmailContent(messageId: string, folder: string = 'INBOX'): Promise<EmailContent> {
    if (!this.config) {
      await this.discoverConfiguration();
    }

    console.log(`📧 Lecture contenu IMAP - ID: ${messageId} - Folder: ${folder} - User: Trh10 - 2025-08-29 12:06:49`);

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.email,
        password: this.password,
        host: this.config.imap.host,
        port: this.config.imap.port,
        tls: this.config.imap.tls,
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
        imap.openBox(folder, true, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          const sequenceNumber = parseInt(messageId);
          if (sequenceNumber > box.messages.total || sequenceNumber < 1) {
            imap.end();
            return reject(new Error(`Message ${messageId} n'existe pas dans ${folder}`));
          }

          const f = imap.seq.fetch(sequenceNumber, { bodies: '', struct: true });
          let emailContent = '';

          f.on('message', (msg, seqno) => {
            msg.on('body', (stream) => {
              stream.on('data', (chunk) => emailContent += chunk.toString('utf8'));
            });

            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(emailContent);
                
                const content: EmailContent = {
                  id: seqno.toString(),
                  subject: parsed.subject || 'Sans sujet',
                  from: parsed.from?.text || 'Expéditeur inconnu',
                  to: parsed.to?.text || 'Destinataire inconnu',
                  cc: parsed.cc?.text || '',
                  bcc: parsed.bcc?.text || '',
                  date: parsed.date || new Date(),
                  textContent: parsed.text || '',
                  htmlContent: parsed.html || '',
                  attachments: parsed.attachments?.map(att => ({
                    filename: att.filename,
                    contentType: att.contentType,
                    size: att.size,
                    content: att.content
                  })) || [],
                  headers: parsed.headers
                };
                
                console.log(`✅ Contenu IMAP lu: ${content.subject} - User: Trh10`);
                imap.end();
                resolve(content);
              } catch (e) {
                imap.end();
                reject(e);
              }
            });
          });

          f.once('error', (err) => {
            imap.end();
            reject(err);
          });
        });
      });

      imap.once('error', reject);
      imap.connect();
    });
  }

  // 📁 GESTION DES DOSSIERS IMAP
  async getFolders(): Promise<EmailFolder[]> {
    if (!this.config) {
      await this.discoverConfiguration();
    }

    console.log(`📁 Récupération dossiers IMAP - User: Trh10 - 2025-08-29 12:06:49`);

    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.email,
        password: this.password,
        host: this.config.imap.host,
        port: this.config.imap.port,
        tls: this.config.imap.tls,
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
        imap.getBoxes((err, boxes) => {
          if (err) {
            imap.end();
            console.error('❌ Erreur récupération dossiers:', err);
            // Retourner les dossiers par défaut en cas d'erreur
            return resolve(this.getDefaultFolders());
          }

          const folders: EmailFolder[] = [];
          
          // Dossiers par défaut toujours présents
          const defaultFolders = [
            { id: 'INBOX', name: '📥 Boîte de réception', priority: 1 },
            { id: 'sent', name: '📤 Envoyés', priority: 2 },
            { id: 'drafts', name: '📝 Brouillons', priority: 3 },
            { id: 'spam', name: '🚫 Spam', priority: 4 },
            { id: 'trash', name: '🗑️ Corbeille', priority: 5 }
          ];

          // Ajouter les dossiers par défaut
          defaultFolders.forEach(folder => {
            folders.push({
              id: folder.id,
              name: folder.name,
              count: 0,
              unreadCount: 0
            });
          });

          // Ajouter les dossiers détectés (s'ils ne sont pas déjà dans les défauts)
          this.addDetectedFolders(boxes, folders);

          console.log(`✅ ${folders.length} dossiers IMAP trouvés`);
          imap.end();
          resolve(folders);
        });
      });

      imap.once('error', (err) => {
        console.error('❌ Erreur connexion pour dossiers:', err);
        resolve(this.getDefaultFolders());
      });

      imap.connect();
    });
  }

  private getDefaultFolders(): EmailFolder[] {
    return [
      { id: 'INBOX', name: '📥 Boîte de réception', count: 0, unreadCount: 0 },
      { id: 'sent', name: '📤 Envoyés', count: 0, unreadCount: 0 },
      { id: 'drafts', name: '📝 Brouillons', count: 0, unreadCount: 0 },
      { id: 'spam', name: '🚫 Spam', count: 0, unreadCount: 0 },
      { id: 'trash', name: '🗑️ Corbeille', count: 0, unreadCount: 0 }
    ];
  }

  private addDetectedFolders(boxes: any, folders: EmailFolder[]) {
    for (const boxName in boxes) {
      const lowerName = boxName.toLowerCase();
      
      // Skip si déjà dans les dossiers par défaut
      const exists = folders.some(f => 
        f.id.toLowerCase() === lowerName ||
        f.name.toLowerCase().includes(lowerName)
      );
      
      if (!exists && !boxName.startsWith('[')) { // Skip dossiers système
        folders.push({
          id: boxName,
          name: `📁 ${boxName}`,
          count: 0,
          unreadCount: 0
        });
      }
    }
  }

  // ✉️ ENVOI D'EMAIL IMAP/SMTP
  async sendEmail(to: string, subject: string, content: string, isHtml = false): Promise<any> {
    if (!this.config) {
      await this.discoverConfiguration();
    }

    console.log(`✉️ Envoi email SMTP - To: ${to} - Subject: ${subject} - User: Trh10 - 2025-08-29 12:06:49`);

    const transporter = nodemailer.createTransporter({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure || false,
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
      console.log(`✅ Email SMTP envoyé - MessageID: ${result.messageId} - User: Trh10`);
      return result;
    } catch (error) {
      console.error('❌ Erreur envoi SMTP:', error);
      throw error;
    }
  }

  // 🗂️ ACTIONS SUR LES EMAILS
  async markAsRead(messageIds: string[], folder: string = 'INBOX'): Promise<void> {
    console.log(`📧 Marquage lu IMAP - IDs: ${messageIds.join(',')} - Folder: ${folder} - User: Trh10 - 2025-08-29 12:06:49`);
    
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.email,
        password: this.password,
        host: this.config.imap.host,
        port: this.config.imap.port,
        tls: this.config.imap.tls,
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
        imap.openBox(folder, false, (err) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          const sequences = messageIds.map(id => parseInt(id)).filter(n => !isNaN(n));
          if (sequences.length === 0) {
            imap.end();
            return resolve();
          }

          imap.seq.addFlags(sequences, '\\Seen', (err) => {
            imap.end();
            if (err) reject(err);
            else {
              console.log(`✅ ${sequences.length} emails marqués comme lus via IMAP - User: Trh10`);
              resolve();
            }
          });
        });
      });

      imap.once('error', reject);
      imap.connect();
    });
  }

  async markAsUnread(messageIds: string[], folder: string = 'INBOX'): Promise<void> {
    console.log(`📧 Marquage non lu IMAP - IDs: ${messageIds.join(',')} - User: Trh10 - 2025-08-29 12:06:49`);
    
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.email,
        password: this.password,
        host: this.config.imap.host,
        port: this.config.imap.port,
        tls: this.config.imap.tls,
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
        imap.openBox(folder, false, (err) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          const sequences = messageIds.map(id => parseInt(id)).filter(n => !isNaN(n));
          if (sequences.length === 0) {
            imap.end();
            return resolve();
          }

          imap.seq.delFlags(sequences, '\\Seen', (err) => {
            imap.end();
            if (err) reject(err);
            else {
              console.log(`✅ ${sequences.length} emails marqués comme non lus via IMAP - User: Trh10`);
              resolve();
            }
          });
        });
      });

      imap.once('error', reject);
      imap.connect();
    });
  }

  async archiveEmails(messageIds: string[]): Promise<void> {
    console.log(`📧 Archivage IMAP - IDs: ${messageIds.join(',')} - User: Trh10 - 2025-08-29 12:06:49`);
    // Pour IMAP, on peut marquer comme lu et/ou déplacer vers Archive si disponible
    await this.markAsRead(messageIds);
    console.log(`✅ ${messageIds.length} emails archivés (marqués comme lus) - User: Trh10`);
  }

  async deleteEmails(messageIds: string[]): Promise<void> {
    console.log(`📧 Suppression IMAP - IDs: ${messageIds.join(',')} - User: Trh10 - 2025-08-29 12:06:49`);
    
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.email,
        password: this.password,
        host: this.config.imap.host,
        port: this.config.imap.port,
        tls: this.config.imap.tls,
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          const sequences = messageIds.map(id => parseInt(id)).filter(n => !isNaN(n));
          if (sequences.length === 0) {
            imap.end();
            return resolve();
          }

          imap.seq.addFlags(sequences, '\\Deleted', (err) => {
            if (err) {
              imap.end();
              return reject(err);
            }

            imap.expunge((err) => {
              imap.end();
              if (err) reject(err);
              else {
                console.log(`✅ ${sequences.length} emails supprimés via IMAP - User: Trh10`);
                resolve();
              }
            });
          });
        });
      });

      imap.once('error', reject);
      imap.connect();
    });
  }

  async getStats(): Promise<any> {
    console.log(`📊 Récupération stats IMAP - User: Trh10 - 2025-08-29 12:06:49`);
    
    return {
      provider: this.provider,
      email: this.email,
      connected: !!this.config,
      timestamp: '2025-08-29 12:06:49',
      user: 'Trh10'
    };
  }
}