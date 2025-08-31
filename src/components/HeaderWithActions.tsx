"use client";
import { Header } from "@components/Header";
import { ActionBar } from "@components/ActionBar";

export function HeaderWithActions() {
  return (
    <div className="border-b border-[var(--border)] bg-white">
      <Header />
      <div className="px-3 py-2">
        <ActionBar />
      </div>
    </div>
  );
}