import { NextRequest, NextResponse } from "next/server";
import { getAuthedGmail, normalizeHeader, parseFrom, scorePriority } from "@lib/google";
import { detectUrgency, hasAttachments, isUnread } from "@lib/gmail-utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const maxResults = parseInt(searchParams.get("maxResults") || "50", 10);
    const pageToken = searchParams.get("pageToken") || undefined;

    const gmail = getAuthedGmail();
    
    const listParams: any = {
      userId: "me",
      maxResults: Math.min(maxResults, 100),
      pageToken
    };
    
    if (query) {
      listParams.q = query;
    }

    console.log("Requête Gmail API:", listParams);

    const list = await gmail.users.messages.list(listParams);
    const messageIds = list.data.messages || [];

    if (messageIds.length === 0) {
      return NextResponse.json({ 
        messages: [], 
        nextPageToken: null,
        resultSizeEstimate: 0
      });
    }

    const messages = await Promise.all(
      messageIds.map(async (m) => {
        try {
          const msg = await gmail.users.messages.get({
            userId: "me",
            id: m.id!,
            format: "metadata",
            metadataHeaders: ["From", "Subject", "Date", "To", "Message-ID"]
          });

          const headers = msg.data.payload?.headers || [];
          const subject = normalizeHeader(headers, "Subject");
          const from = normalizeHeader(headers, "From");
          const date = normalizeHeader(headers, "Date");
          const to = normalizeHeader(headers, "To");
          const messageId = normalizeHeader(headers, "Message-ID");
          const snippet = msg.data.snippet || "";
          const labelIds = msg.data.labelIds || [];
          
          const { fromName } = parseFrom(from);
          
          // Détection intelligente d'urgence
          const urgency = detectUrgency(subject || "", snippet, from || "");
          const priority = urgency === "high" ? "high" : urgency === "medium" ? "medium" : "low";
          
          // État de lecture
          const unread = isUnread(labelIds);
          
          // Pièces jointes
          const hasAttach = hasAttachments(snippet, labelIds);

          return {
            id: m.id!,
            threadId: m.threadId!,
            subject: subject || "(Pas de sujet)",
            from: from || "",
            fromName: fromName || from || "",
            to: to || "",
            date: date ? new Date(date).toISOString() : new Date().toISOString(),
            snippet,
            body: `<p>${snippet}</p>`,
            priority,
            urgency, // Nouvelle propriété
            tags: [],
            read: !unread,
            unread: unread,
            messageId: messageId || "",
            labelIds,
            hasAttachments: hasAttach
          };
        } catch (error) {
          console.error(`Erreur pour message ${m.id}:`, error);
          return null;
        }
      })
    );

    // Filtrer les messages null (erreurs)
    const validMessages = messages.filter(Boolean);

    return NextResponse.json({
      messages: validMessages,
      nextPageToken: list.data.nextPageToken || null,
      resultSizeEstimate: list.data.resultSizeEstimate || validMessages.length
    });
  } catch (e: any) {
    console.error("Erreur API list:", e);
    const m = e?.message || "Error";
    const status = m.includes("Not authenticated") ? 401 : 500;
    return NextResponse.json({ error: m }, { status });
  }
}