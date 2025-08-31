"use client";
// import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // Temporarily disabled next-auth session provider
  return <>{children}</>;
}