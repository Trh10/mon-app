import LiveCursors from "../../components/Collab/LiveCursors";
import ChatPanel from "../../components/Collab/ChatPanel";

export default function CollabDemo() {
  const roomId = "demo-room";
  return (
    <main style={{ maxWidth: 960, margin: "24px auto", padding: 16 }}>
      <h1>Collaboration (démo)</h1>
      <p>Ouvre deux onglets sur / (le bouton “Collaboration”) pour tester le panneau sans changer de page.</p>
      <LiveCursors roomId={roomId} userName="Alice" role="manager" />
      <div style={{ marginTop: 16 }}>
        <ChatPanel roomId={roomId} user="Alice" role="manager" />
      </div>
    </main>
  );
}