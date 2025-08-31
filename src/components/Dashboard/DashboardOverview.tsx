"use client";
import React, { useEffect, useState } from "react";

type Data = {
  productivity: { avgResponseTimeMin: number; emailsPerDay: number; processedToday: number };
  workload: { overloaded: { user: string; load: number }[]; underutilized: { user: string; load: number }[] };
  deadlines: { atRiskCount: number; examples: { id: string; title: string; risk: number }[] };
  performanceScore: number;
};

export default function DashboardOverview() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/analytics/overview", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Erreur");
        setData(json);
      } catch (e: any) { setErr(e?.message || "Erreur"); }
    })();
  }, []);

  if (err) return <div style={{ color: "#b91c1c" }}>{err}</div>;
  if (!data) return <div>Chargement…</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
        <h3>Productivité</h3>
        <div>Temps de réponse moyen: {data.productivity.avgResponseTimeMin} min</div>
        <div>Emails/jour: {data.productivity.emailsPerDay}</div>
        <div>Traités aujourd’hui: {data.productivity.processedToday}</div>
      </section>
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
        <h3>Charge de travail</h3>
        <div>🔴 Surchargés:</div>
        <ul>{data.workload.overloaded.map((u) => (<li key={u.user}>{u.user}: {(u.load * 100).toFixed(0)}%</li>))}</ul>
        <div>🟢 Sous-utilisés:</div>
        <ul>{data.workload.underutilized.map((u) => (<li key={u.user}>{u.user}: {(u.load * 100).toFixed(0)}%</li>))}</ul>
      </section>
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
        <h3>Deadlines à risque</h3>
        <div>Nombre de risques: {data.deadlines.atRiskCount}</div>
        <ul>{data.deadlines.examples.map((t) => (<li key={t.id}>{t.id} — {t.title} (risque {(t.risk * 100).toFixed(0)}%)</li>))}</ul>
      </section>
      <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
        <h3>Score de performance équipe</h3>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{data.performanceScore}/100</div>
      </section>
    </div>
  );
}