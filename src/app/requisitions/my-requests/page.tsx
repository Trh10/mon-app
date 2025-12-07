"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  CheckCircle, Clock, XCircle, AlertCircle, Eye, DollarSign, 
  FileText, ArrowLeft, RefreshCw, Package, ChevronRight, Sparkles, 
  Target, History, Search, ExternalLink, File, Download, Printer, CheckCheck, Ban
} from "lucide-react";
import { useCodeAuth } from "@/components/auth/CodeAuthContext";
import Link from "next/link";

interface EtatBesoin {
  id: string;
  reference: string;
  titre: string;
  demandeur: string;
  description: string;
  produits: { nom: string; prix: number }[];
  total: number;
  statut: string;
  dateCreation: string;
  isDocumentOnly?: boolean;
  documentUrl?: string;
  documentName?: string;
  // Champs d'approbation
  approuvePar?: string;
  dateApprobation?: string;
  commentaireApprobation?: string;
}

export default function MesDemandesPage() {
  const { user } = useCodeAuth();
  const [besoins, setBesoins] = useState<EtatBesoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("tous");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchMesBesoins = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await fetch("/api/besoins");
      if (response.ok) {
        const data = await response.json();
        const allBesoins = data.besoins || [];
        const mesBesoins = allBesoins.filter((b: EtatBesoin) => {
          const nomDemandeur = b.demandeur?.toLowerCase().trim() || "";
          const nomUser = user.name?.toLowerCase().trim() || "";
          return nomDemandeur === nomUser || nomDemandeur.includes(nomUser) || nomUser.includes(nomDemandeur);
        });
        setBesoins(mesBesoins);
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMesBesoins();
  }, [fetchMesBesoins]);

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(montant || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const stats = {
    total: besoins.length,
    soumis: besoins.filter(b => b.statut === "soumis").length,
    approuves: besoins.filter(b => b.statut === "approuve").length,
    rejetes: besoins.filter(b => b.statut === "rejete").length,
    montantTotal: besoins.reduce((sum, b) => sum + (b.total || 0), 0)
  };

  const besoinsFiltres = besoins.filter(b => {
    const matchStatus = statusFilter === "tous" || b.statut === statusFilter;
    const matchSearch = !searchTerm || b.titre?.toLowerCase().includes(searchTerm.toLowerCase()) || b.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getStatusInfo = (statut: string) => {
    switch (statut) {
      case "approuve": return { bg: "bg-green-500", label: "Approuve" };
      case "rejete": return { bg: "bg-red-500", label: "Rejete" };
      default: return { bg: "bg-amber-500", label: "Soumis" };
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-xl p-8 text-center shadow">
          <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Connexion requise</h2>
          <p className="text-gray-600">Veuillez vous connecter pour voir vos etats de besoin.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/requisitions" className="text-emerald-100 hover:text-white flex items-center gap-1 mb-4">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <div className="flex items-center gap-3 mb-6">
            <Target className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Mes Demandes</h1>
              <p className="text-emerald-100">Suivez vos etats de besoin</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div onClick={() => setStatusFilter("tous")} className="bg-white/10 rounded-lg p-4 cursor-pointer">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm">Total</p>
            </div>
            <div onClick={() => setStatusFilter("soumis")} className="bg-white/10 rounded-lg p-4 cursor-pointer">
              <p className="text-2xl font-bold">{stats.soumis}</p>
              <p className="text-sm">En attente</p>
            </div>
            <div onClick={() => setStatusFilter("approuve")} className="bg-white/10 rounded-lg p-4 cursor-pointer">
              <p className="text-2xl font-bold">{stats.approuves}</p>
              <p className="text-sm">Approuves</p>
            </div>
            <div onClick={() => setStatusFilter("rejete")} className="bg-white/10 rounded-lg p-4 cursor-pointer">
              <p className="text-2xl font-bold">{stats.rejetes}</p>
              <p className="text-sm">Rejetes</p>
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Total: {formatMontant(stats.montantTotal)}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl p-4 mb-6 shadow">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <button onClick={fetchMesBesoins} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Actualiser
            </button>
          </div>
        </div>

        {besoinsFiltres.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune demande</h3>
            <Link href="/requisitions" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg">
              <Sparkles className="h-4 w-4" /> Creer un etat de besoin
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {besoinsFiltres.map((besoin) => {
              const statusInfo = getStatusInfo(besoin.statut);
              return (
                <div key={besoin.id} className="bg-white rounded-xl shadow overflow-hidden">
                  <div className={`${statusInfo.bg} px-6 py-3 flex justify-between text-white`}>
                    <div>
                      <p className="font-bold">{statusInfo.label}</p>
                      <p className="text-sm opacity-90">{besoin.reference}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{formatMontant(besoin.total)}</p>
                      <p className="text-sm opacity-90">{formatDate(besoin.dateCreation)}</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold mb-2">{besoin.titre}</h3>
                    <p className="text-gray-600 mb-4">{besoin.description || "Aucune description"}</p>
                    {besoin.isDocumentOnly && besoin.documentUrl && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
                        <File className="h-5 w-5 text-blue-600" />
                        <span className="flex-1 text-blue-800">{besoin.documentName}</span>
                        <a href={besoin.documentUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-1">
                          <ExternalLink className="h-4 w-4" /> Voir
                        </a>
                      </div>
                    )}
                    {besoin.produits && besoin.produits.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-2 flex items-center gap-2"><Package className="h-4 w-4" /> Produits</p>
                        <div className="flex flex-wrap gap-2">
                          {besoin.produits.map((p, i) => (
                            <span key={i} className="px-3 py-1 bg-gray-100 rounded text-sm">{p.nom} - {formatMontant(p.prix)}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <History className="h-4 w-4" />
                      <span>Statut: {statusInfo.label}</span>
                    </div>
                    
                    {/* Info d'approbation pour les demandes approuvées */}
                    {besoin.statut === "approuve" && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCheck className="h-5 w-5 text-green-600" />
                          <span className="font-semibold text-green-800">Approuvé par la Direction Générale</span>
                        </div>
                        {besoin.approuvePar && (
                          <p className="text-sm text-green-700">
                            Approuvé par <strong>{besoin.approuvePar}</strong>
                            {besoin.dateApprobation && ` le ${formatDate(besoin.dateApprobation)}`}
                          </p>
                        )}
                        {besoin.commentaireApprobation && (
                          <p className="text-sm text-green-600 mt-1 italic">"{besoin.commentaireApprobation}"</p>
                        )}
                        <div className="mt-3 flex gap-2">
                          <a
                            href={`/api/besoins/pdf?id=${besoin.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                          >
                            <Download className="h-4 w-4" />
                            Télécharger le document d'approbation
                          </a>
                          <a
                            href={`/api/besoins/pdf?id=${besoin.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                          >
                            <Printer className="h-4 w-4" />
                            Imprimer
                          </a>
                        </div>
                        <p className="text-xs text-green-600 mt-2">
                          Présentez ce document au service financier pour le décaissement.
                        </p>
                      </div>
                    )}
                    
                    {/* Info de rejet */}
                    {besoin.statut === "rejete" && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Ban className="h-5 w-5 text-red-600" />
                          <span className="font-semibold text-red-800">Demande rejetée</span>
                        </div>
                        {besoin.approuvePar && (
                          <p className="text-sm text-red-700">
                            Rejeté par <strong>{besoin.approuvePar}</strong>
                            {besoin.dateApprobation && ` le ${formatDate(besoin.dateApprobation)}`}
                          </p>
                        )}
                        {besoin.commentaireApprobation && (
                          <p className="text-sm text-red-600 mt-1 italic">Raison: "{besoin.commentaireApprobation}"</p>
                        )}
                        <Link
                          href="/requisitions"
                          className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                          <Sparkles className="h-4 w-4" />
                          Soumettre une nouvelle demande
                        </Link>
                      </div>
                    )}
                    
                    {/* En attente */}
                    {besoin.statut === "soumis" && (
                      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
                          <span className="font-semibold text-amber-800">En attente d'approbation</span>
                        </div>
                        <p className="text-sm text-amber-700 mt-1">
                          Votre demande est en cours d'examen par la Direction Générale.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
