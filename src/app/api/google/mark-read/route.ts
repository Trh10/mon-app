import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Récupère l'ID du message (peu importe la clé utilisée côté front)
    const body = await req.json().catch(() => ({}));
    const messageId = body?.id || body?.messageId || body?.gmailId || null;

    console.log("📬 Mark-read demandé pour:", messageId);

    // TODO: Intégration réelle Gmail (API users.messages.modify)
    // Pour l’instant, on renvoie succès pour ne pas bloquer l’UI
    return NextResponse.json({
      ok: true,
      messageId,
      markedRead: false,
      note: "Stub: mark-read ignoré côté serveur pour débloquer l'UI"
    });
  } catch (e: any) {
    console.error("❌ Erreur mark-read:", e?.message || e);
    // Même en cas d'erreur, on évite de bloquer l'UI
    return NextResponse.json({
      ok: false,
      error: e?.message || "Erreur inconnue",
    }, { status: 200 });
  }
}