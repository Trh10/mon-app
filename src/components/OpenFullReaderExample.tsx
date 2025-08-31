"use client";
import { useState } from "react";
import { FullReader } from "@components/FullReader";

// Exemple minimal à adapter à ton UI: appelle setOpenId(id) au clic d'un mail
export function OpenFullReaderExample() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      {/* ... ton interface liste/mail existante ... */}
      {/* ex: <button onClick={() => setOpenId(m.id)}>Ouvrir</button> */}
      {openId && <FullReader messageId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}