"use client";

import { useEffect, useRef, useState } from "react";

type Attachment = {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
};

type MessageDetail = {
  id: string;
  threadId?: string;
  headers: {
    subject: string;
    from: string;
    to?: string;
    date?: string;
    inReplyTo?: string;
    references?: string;
  };
  bodyHtml: string;
  bodyText?: string;
  attachments: Attachment[];
};

export function FullReader({ messageId, onClose }: { messageId: string; onClose: () => void }) {
  const [data, setData] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`/api/google/message?id=${encodeURIComponent(messageId)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = (await res.json()) as MessageDetail;
        if (aborted) return;
        setData(j);
      } catch (e: any) {
        if (!aborted) setErr(e?.message || "Erreur");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [messageId]);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <div className="font-semibold truncate">{data?.headers.subject || "Message"}</div>
        <button className="px-2 py-1 rounded border" onClick={onClose}>Fermer</button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-4 text-[var(--muted)]">Chargement…</div>
        ) : err ? (
          <div className="p-4 text-red-600">Erreur: {err}</div>
        ) : data ? (
          <div className="p-4">
            <div className="text-sm text-[var(--muted)] mb-2">
              De: {data.headers.from} | À: {data.headers.to} | {data.headers.date}
            </div>
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: data.bodyHtml }} />
            {data.attachments.length > 0 && (
              <div className="mt-4">
                <div className="font-medium mb-1">Pièces jointes</div>
                <ul className="space-y-1">
                  {data.attachments.map((a) => (
                    <li key={a.attachmentId}>
                      <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                        {a.filename} ({Math.round(a.size / 1024)} Ko)
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}