"use client";
import { Header } from "@components/Header";
import { ActionBar } from "@components/actionBar";

export function HeaderWithActions() {
  return (
    <div className="border-b border-[var(--border)] bg-white">
      <Header 
        source="mock"
        onSourceChange={() => {}}
        currentFolder="INBOX"
        onFolderChange={() => {}}
        onDisconnect={() => {}}
        onRefresh={() => {}}
      />
      <div className="px-3 py-2">
        <ActionBar />
      </div>
    </div>
  );
}