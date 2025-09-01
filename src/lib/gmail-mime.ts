import { gmail_v1 } from 'googleapis';

export type MimeAttachment = {
  filename: string;
  contentType: string; // ex: application/pdf
  dataBase64: string;  // base64 classique du fichier
};

function toBase64Url(b64: string) {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function buildMimeMessage(opts: {
  from?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  attachments?: MimeAttachment[];
}) {
  const boundary = "pepite-boundary-" + Math.random().toString(36).slice(2);

  const lines: string[] = [];
  lines.push(`To: ${opts.to}`);
  lines.push(`Subject: ${opts.subject}`);
  if (opts.from) lines.push(`From: ${opts.from}`);
  if (opts.headers) for (const [k, v] of Object.entries(opts.headers)) lines.push(`${k}: ${v}`);

  const hasAttachments = (opts.attachments?.length || 0) > 0;
  lines.push(`MIME-Version: 1.0`);
  if (hasAttachments) {
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push("");
    lines.push(`--${boundary}`);
  }

  const bodyBoundary = "pepite-body-" + Math.random().toString(36).slice(2);
  if (hasAttachments) {
    lines.push(`Content-Type: multipart/alternative; boundary="${bodyBoundary}"`);
    lines.push("");
  }

  if (opts.text) {
    if (hasAttachments) lines.push(`--${bodyBoundary}`);
    lines.push(`Content-Type: text/plain; charset="UTF-8"`);
    lines.push(`Content-Transfer-Encoding: 7bit`);
    lines.push("");
    lines.push(opts.text);
    lines.push("");
  }

  const html = opts.html || "<div></div>";
  if (hasAttachments) lines.push(`--${bodyBoundary}`);
  lines.push(`Content-Type: text/html; charset="UTF-8"`);
  lines.push(`Content-Transfer-Encoding: 7bit`);
  lines.push("");
  lines.push(html);
  lines.push("");

  if (hasAttachments) {
    lines.push(`--${bodyBoundary}--`);
    lines.push("");

    for (const att of opts.attachments!) {
      lines.push(`--${boundary}`);
      lines.push(`Content-Type: ${att.contentType}; name="${att.filename}"`);
      lines.push(`Content-Disposition: attachment; filename="${att.filename}"`);
      lines.push(`Content-Transfer-Encoding: base64`);
      lines.push("");
      lines.push(att.dataBase64.replace(/\r?\n/g, ""));
      lines.push("");
    }
    lines.push(`--${boundary}--`);
  }

  const mime = lines.join("\r\n");
  const rawB64 = Buffer.from(mime, "utf8").toString("base64");
  return toBase64Url(rawB64);
}

interface MimeMessageOptions {
  to: string;
  from: string;
  subject: string;
  threadId: string;
  inReplyTo?: string;
  references?: string;
}

export function createMimeMessage(options: MimeMessageOptions, originalMessage: gmail_v1.Schema$Message, body: string) {
  const { to, from, subject, threadId } = options;

  const payload = originalMessage.payload;
  const headers = payload?.headers;

  const inReplyToHeader = headers?.find((h) => h.name === 'Message-ID');
  const referencesHeader = headers?.find((h) => h.name === 'References');

  const emailHeaders: { [key: string]: string | null | undefined } = {
    'To': to,
    'From': from,
    'Subject': subject,
    'In-Reply-To': inReplyToHeader?.value,
    'References': referencesHeader?.value,
    'Content-Type': 'text/html; charset=utf-8'
  };

  let email = '';
  for (const header in emailHeaders) {
    if (emailHeaders[header]) {
      email += `${header}: ${emailHeaders[header]}\r\n`;
    }
  }
  email += '\r\n' + body;

  const base64EncodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return {
    raw: base64EncodedEmail,
    threadId: threadId
  };
}