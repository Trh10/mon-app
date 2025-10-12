// Utilitaire pour tester la collaboration en temps réel
export async function testCollaboration() {
  console.log("🧪 Test de la collaboration en temps réel");
  
  // 1. Test de connexion SSE
  const sse = new EventSource(`/api/realtime/stream?room=test&id=test-user&name=TestUser&role=employe`);
  
  sse.addEventListener("ready", (e) => {
    console.log("✅ SSE connecté:", JSON.parse(e.data));
  });
  
  sse.addEventListener("presence", (e) => {
    const data = JSON.parse(e.data);
    console.log("👥 Présence:", data.members?.length || 0, "membres connectés");
    data.members?.forEach((m: any) => console.log(`  - ${m.name} (${m.status})`));
  });
  
  sse.addEventListener("chat", (e) => {
    const data = JSON.parse(e.data);
    console.log("💬 Messages:", data.messages?.length || 0, "messages");
    data.messages?.slice(-3).forEach((m: any) => 
      console.log(`  - ${m.user.name}: ${m.text}`)
    );
  });
  
  sse.addEventListener("error", (e) => {
    console.error("❌ Erreur SSE:", e);
  });
  
  // 2. Test d'envoi de message après 3 secondes
  setTimeout(async () => {
    try {
      const response = await fetch("/api/realtime/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: "test",
          event: "chat",
          payload: { text: "Hello from test!" },
          user: { id: "test-user", name: "TestUser", role: "employe" }
        })
      });
      
      const result = await response.json();
      console.log("📤 Message envoyé:", result);
    } catch (error) {
      console.error("❌ Erreur envoi message:", error);
    }
  }, 3000);
  
  // 3. Nettoyage après 10 secondes
  setTimeout(() => {
    sse.close();
    console.log("🔚 Test terminé");
  }, 10000);
  
  return sse;
}

// Pour utiliser dans la console du navigateur:
// testCollaboration()
