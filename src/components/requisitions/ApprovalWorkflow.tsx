"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Clock, User, Calendar, FileText, Download, Eye, Shield, ArrowLeft, RefreshCw, Search, CheckCheck, Ban, Crown } from "lucide-react";
import { useCodeAuth } from "@/components/auth/CodeAuthContext";
import Link from "next/link";

interface EtatBesoin {
  id: string;
  reference: string;
  titre: string;
  demandeur: string;
  description: string;
  produits: Array<{ designation: string; quantite: number; prixUnitaire: number; total: number }>;
  total: number;
  statut: "brouillon" | "soumis" | "approuve" | "rejete";
  dateCreation: string;
  approuvePar?: string;
  dateApprobation?: string;
  commentaireApprobation?: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  brouillon: { label: "Brouillon", color: "bg-gray-100 text-gray-800" },
  soumis: { label: "En attente", color: "bg-amber-100 text-amber-800" },
  approuve: { label: "Approuve", color: "bg-green-100 text-green-800" },
  rejete: { label: "Rejete", color: "bg-red-100 text-red-800" },
};

export default function ApprovalWorkflow() {
  const { user } = useCodeAuth();
  const [besoins, setBesoins] = useState<EtatBesoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBesoin, setSelectedBesoin] = useState<EtatBesoin | null>(null);
  const [comment, setComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<string>("soumis");
  const [searchTerm, setSearchTerm] = useState("");

  // Vérifier le niveau d'accès - level ou role "Directeur Général"
  const userLevel = (user as any)?.level || 0;
  const isDG = userLevel >= 10 || user?.role === "Directeur Général";

  const loadBesoins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/besoins");
      if (res.ok) {
        const data = await res.json();
        setBesoins(data.besoins || []);
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBesoins(); }, [loadBesoins]);

  const filteredBesoins = besoins.filter((b) => {
    const matchFilter = filter === "all" || b.statut === filter;
    const matchSearch = searchTerm === "" || b.reference.toLowerCase().includes(searchTerm.toLowerCase()) || b.titre.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  const stats = {
    total: besoins.length,
    enAttente: besoins.filter((b) => b.statut === "soumis").length,
    approuves: besoins.filter((b) => b.statut === "approuve").length,
    rejetes: besoins.filter((b) => b.statut === "rejete").length,
    montantTotal: besoins.filter((b) => b.statut === "approuve").reduce((sum, b) => sum + b.total, 0),
  };

  const handleDecision = async (decision: "approuve" | "rejete") => {
    if (!selectedBesoin || !isDG) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/besoins/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ besoinId: selectedBesoin.id, decision, commentaire: comment, approuvePar: user?.name }),
      });
      if (res.ok) { await loadBesoins(); setSelectedBesoin(null); setComment(""); }
    } catch (error) { console.error(error); }
    finally { setProcessing(false); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  const formatMoney = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD" }).format(n);

  // Restreindre l'accès si niveau < 6 ET pas DG
  if (userLevel < 6 && !isDG) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acces Restreint</h2>
          <Link href="/requisitions" className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl"><ArrowLeft className="h-5 w-5" />Retour</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50">
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/requisitions" className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft className="h-5 w-5" /></Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {isDG ? <><Crown className="h-6 w-6 text-amber-500" />Approbation DG</> : <><Eye className="h-6 w-6 text-blue-500" />Consultation</>}
              </h1>
            </div>
          </div>
          <button onClick={loadBesoins} className="p-2 hover:bg-gray-100 rounded-xl"><RefreshCw className={loading ? "animate-spin h-5 w-5" : "h-5 w-5"} /></button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {!isDG && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Eye className="h-5 w-5 text-blue-600" />
            <p className="text-blue-800">Mode observation - Seul le DG peut approuver.</p>
          </div>
        )}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-gray-500">Total</p></div>
          <div className="bg-white rounded-xl p-4 shadow-sm"><p className="text-2xl font-bold text-amber-600">{stats.enAttente}</p><p className="text-xs text-gray-500">En attente</p></div>
          <div className="bg-white rounded-xl p-4 shadow-sm"><p className="text-2xl font-bold text-green-600">{stats.approuves}</p><p className="text-xs text-gray-500">Approuves</p></div>
          <div className="bg-white rounded-xl p-4 shadow-sm"><p className="text-2xl font-bold text-red-600">{stats.rejetes}</p><p className="text-xs text-gray-500">Rejetes</p></div>
          <div className="bg-white rounded-xl p-4 shadow-sm"><p className="text-lg font-bold text-emerald-600">{formatMoney(stats.montantTotal)}</p><p className="text-xs text-gray-500">Approuve</p></div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-xl" />
          </div>
          <div className="flex gap-2">
            {["all", "soumis", "approuve", "rejete"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={filter === f ? "px-4 py-2 rounded-xl bg-purple-600 text-white" : "px-4 py-2 rounded-xl bg-gray-100"}>{f === "all" ? "Tous" : f}</button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-purple-600 border-t-transparent rounded-full"></div></div>
        ) : filteredBesoins.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center"><FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" /><p>Aucun resultat</p></div>
        ) : (
          <div className="space-y-4">
            {filteredBesoins.map((besoin) => {
              const status = statusConfig[besoin.statut];
              return (
                <div key={besoin.id} className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex justify-between mb-4">
                    <div>
                      <span className="text-lg font-bold">{besoin.reference}</span>
                      <span className={`ml-3 px-3 py-1 rounded-full text-xs ${status.color}`}>{status.label}</span>
                      <h3 className="text-xl font-semibold mt-1">{besoin.titre}</h3>
                    </div>
                    <div className="text-right"><p className="text-2xl font-bold text-purple-600">{formatMoney(besoin.total)}</p></div>
                  </div>
                  <div className="flex gap-6 text-sm text-gray-600 mb-4">
                    <span className="flex items-center gap-2"><User className="h-4 w-4" />{besoin.demandeur}</span>
                    <span className="flex items-center gap-2"><Calendar className="h-4 w-4" />{formatDate(besoin.dateCreation)}</span>
                  </div>
                  {besoin.statut === "approuve" && besoin.approuvePar && (
                    <div className="bg-green-50 rounded-lg p-3 mb-4 flex items-center gap-2"><CheckCheck className="h-5 w-5 text-green-600" /><span className="text-green-800">Approuve par {besoin.approuvePar}</span></div>
                  )}
                  {besoin.statut === "rejete" && (
                    <div className="bg-red-50 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2"><Ban className="h-5 w-5 text-red-600" /><span className="text-red-800">Rejete par {besoin.approuvePar}</span></div>
                      {besoin.commentaireApprobation && <p className="text-red-700 text-sm ml-7">{besoin.commentaireApprobation}</p>}
                    </div>
                  )}
                  <div className="flex gap-3 pt-4 border-t">
                    <button onClick={() => setSelectedBesoin(besoin)} className="px-4 py-2 bg-gray-100 rounded-lg flex items-center gap-2"><Eye className="h-4 w-4" />Details</button>
                    {besoin.statut === "approuve" && <a href={`/api/besoins/pdf?id=${besoin.id}`} target="_blank" className="px-4 py-2 bg-green-100 text-green-700 rounded-lg flex items-center gap-2"><Download className="h-4 w-4" />PDF</a>}
                    {isDG && besoin.statut === "soumis" && (
                      <>
                        <button onClick={() => setSelectedBesoin(besoin)} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><CheckCircle className="h-4 w-4" />Approuver</button>
                        <button onClick={() => setSelectedBesoin(besoin)} className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2"><XCircle className="h-4 w-4" />Rejeter</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {selectedBesoin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between">
              <div><h2 className="text-xl font-bold">{selectedBesoin.reference}</h2><p className="text-gray-600">{selectedBesoin.titre}</p></div>
              <button onClick={() => { setSelectedBesoin(null); setComment(""); }} className="p-2 hover:bg-gray-100 rounded-lg"><XCircle className="h-6 w-6 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4"><p className="text-sm text-gray-500">Demandeur</p><p className="font-semibold">{selectedBesoin.demandeur}</p></div>
                <div className="bg-gray-50 rounded-lg p-4"><p className="text-sm text-gray-500">Date</p><p className="font-semibold">{formatDate(selectedBesoin.dateCreation)}</p></div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className="text-left p-3">Designation</th><th className="text-center p-3">Qte</th><th className="text-right p-3">P.U.</th><th className="text-right p-3">Total</th></tr></thead>
                  <tbody>
                    {selectedBesoin.produits.map((p, i) => (<tr key={i} className="border-t"><td className="p-3">{p.designation}</td><td className="text-center p-3">{p.quantite}</td><td className="text-right p-3">{formatMoney(p.prixUnitaire)}</td><td className="text-right p-3 font-medium">{formatMoney(p.total)}</td></tr>))}
                  </tbody>
                  <tfoot className="bg-purple-50"><tr><td colSpan={3} className="p-3 text-right font-semibold">Total:</td><td className="p-3 text-right font-bold text-purple-600">{formatMoney(selectedBesoin.total)}</td></tr></tfoot>
                </table>
              </div>
              {isDG && selectedBesoin.statut === "soumis" && (
                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" />Decision DG</h4>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full border rounded-lg p-3 mb-4" placeholder="Commentaire..." />
                  <div className="flex gap-3">
                    <button onClick={() => handleDecision("approuve")} disabled={processing} className="flex-1 py-3 bg-green-600 text-white rounded-xl flex items-center justify-center gap-2"><CheckCircle className="h-5 w-5" />{processing ? "..." : "Approuver"}</button>
                    <button onClick={() => handleDecision("rejete")} disabled={processing} className="flex-1 py-3 bg-red-600 text-white rounded-xl flex items-center justify-center gap-2"><XCircle className="h-5 w-5" />{processing ? "..." : "Rejeter"}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
