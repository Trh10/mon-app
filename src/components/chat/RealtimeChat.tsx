"use client";
import { useEffect, useRef, useState } from "react";
import { getRealtimeClient } from "@/lib/realtime/provider";

type Member = { id: string; name: string; role: string };
type Msg = { id: string; author: Member; text: string; ts: number };

export default function RealtimeChat({ room, self }: { room: string; self: Member }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const rt = getRealtimeClient();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rt.connect(room, self.id, self.name, self.role);
    const off = rt.on("chat", (d) => setMessages((prev) => [...prev, d]));
    return () => { off(); rt.disconnect(); };
  }, [room, self.id, self.name, self.role]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!text.trim()) return;
    const msg: Msg = { id: Math.random().toString(36).slice(2,9), author: self, text: text.trim(), ts: Date.now() };
    setText("");
    await rt.emit("chat", msg);
  }

  return (
    <div className="border rounded-lg flex flex-col h-80">
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <b>{m.author.name}</b>: {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="p-2 border-t flex gap-2">
        <input className="flex-1 border rounded px-2 py-1" value={text} onChange={(e)=>setText(e.target.value)} placeholder="Votre message..." />
        <button className="px-4 py-1 rounded bg-blue-600 text-white" onClick={send}>Envoyer</button>
      </div>
    </div>
  );
}
