import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreIfAvailable } from "../../../../lib/firebase-admin";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

// Route pour initialiser les notifications d'un utilisateur
export async function POST(req: NextRequest) {
  try {
    const { userId, deviceToken, permissions } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    const db = getFirestoreIfAvailable();
    if (db) {
      // Enregistrer le token de notification pour cet utilisateur
      await db.collection("user_notifications").doc(userId).set({
        deviceToken: deviceToken || null,
        permissions: permissions || { messages: true, mentions: true },
        lastSeen: Date.now(),
        enabled: true
      }, { merge: true });
    }

    console.log(`[NOTIF] Notifications initialisées pour ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: db ? "Notifications configurées" : "Notifications configurées (local)" 
    });

  } catch (error) {
    console.error("Erreur init notifications:", error);
    return NextResponse.json({ 
      error: "Erreur serveur" 
    }, { status: 500 });
  }
}

// Route pour récupérer les notifications d'un utilisateur
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ error: "userId requis" }, { status: 400 });
    }

    const db = getFirestoreIfAvailable();
    if (!db) {
      return NextResponse.json({ 
        success: true, 
        message: 'Système de notifications en mode local',
        notifications: [],
        count: 0
      });
    }

    // Récupérer les notifications non lues
    const notifications = await db
      .collection("notifications")
      .where("userId", "==", userId)
      .where("read", "==", false)
      .orderBy("timestamp", "desc")
      .limit(20)
      .get();

  const notifList = notifications.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ 
      success: true,
      notifications: notifList,
      count: notifList.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Erreur get notifications:", error);
    return NextResponse.json({ 
      success: true,
      message: 'Système de notifications en mode fallback',
      notifications: [],
      count: 0
    });
  }
}
