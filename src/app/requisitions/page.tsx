'use client';

import { useState, useEffect } from 'react';
import { useCodeAuth } from '@/components/auth/CodeAuthContext';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  DollarSign,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Eye,
  Download,
  Upload,
  Package,
  Receipt,
  X,
  FileUp,
  Loader2,
  Shield,
  Lock,
  File
} from 'lucide-react';

// Types simplifiés
interface Produit {
  id: string;
  nom: string;
  prix: number;
}

interface EtatBesoin {
  id: string;
  reference: string;
  titre: string;
  demandeur: string;
  description: string;
  produits: Produit[];
  total: number;
  statut: 'soumis' | 'approuve' | 'rejete';
  dateCreation: string;
  documentUrl?: string;
  documentName?: string;
  isDocumentOnly?: boolean;
}

const STATUT_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  soumis: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
  approuve: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  rejete: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle }
};

// Rôles autorisés
const ROLES_AUTORISES = ['dg', 'directeur', 'financier', 'finance', 'administration', 'admin'];
const NIVEAUX_AUTORISES = [8, 9, 10];

// Carte État de Besoin
function EtatBesoinCard({ 
  besoin, 
  onDelete,
  onViewDoc
}: { 
  besoin: EtatBesoin; 
  onDelete: (id: string) => void;
  onViewDoc: (url: string, name: string) => void;
}) {
  const statutInfo = STATUT_COLORS[besoin.statut];
  const StatutIcon = statutInfo.icon;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="flex items-start justify-between">
          <div>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
              {besoin.reference}
            </span>
            <h3 className="text-xl font-bold mt-2">{besoin.titre}</h3>
            <p className="text-emerald-100 text-sm flex items-center gap-2 mt-1">
              <User className="w-4 h-4" />
              {besoin.demandeur}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-full ${statutInfo.bg} ${statutInfo.text} flex items-center gap-1.5 text-sm font-medium`}>
            <StatutIcon className="w-4 h-4" />
            {besoin.statut === 'soumis' ? 'En attente' : besoin.statut === 'approuve' ? 'Approuvé' : 'Rejeté'}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-5">
        {besoin.isDocumentOnly && besoin.documentUrl ? (
          // Si c'est un document uploadé
          <div className="bg-purple-50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <File className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{besoin.documentName}</p>
                <p className="text-sm text-gray-500">Document uploadé</p>
              </div>
              <button
                onClick={() => onViewDoc(besoin.documentUrl!, besoin.documentName!)}
                className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                title="Voir le document"
              >
                <Eye className="w-5 h-5 text-purple-600" />
              </button>
              <a
                href={besoin.documentUrl}
                download={besoin.documentName}
                className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                title="Télécharger"
              >
                <Download className="w-5 h-5 text-purple-600" />
              </a>
            </div>
          </div>
        ) : (
          // Si c'est un formulaire rempli
          <>
            {besoin.description && (
              <p className="text-gray-600 text-sm mb-4">{besoin.description}</p>
            )}
            
            {besoin.produits.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Produits demandés
                </h4>
                <div className="space-y-2">
                  {besoin.produits.map((produit) => (
                    <div key={produit.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                      <span className="text-gray-700">{produit.nom}</span>
                      <span className="font-semibold text-gray-900">${produit.prix.toLocaleString('fr-FR')}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t-2 border-gray-300 flex items-center justify-between">
                  <span className="font-bold text-gray-700">Total</span>
                  <span className="text-xl font-bold text-emerald-600">${besoin.total.toLocaleString('fr-FR')}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Date et actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">
            {new Date(besoin.dateCreation).toLocaleDateString('fr-FR')}
          </span>
          <button
            onClick={() => onDelete(besoin.id)}
            className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de création simplifié
function CreateModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  userName
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  userName: string;
}) {
  const [mode, setMode] = useState<'form' | 'upload'>('form');
  const [titre, setTitre] = useState('');
  const [demandeur, setDemandeur] = useState(userName);
  const [description, setDescription] = useState('');
  const [produits, setProduits] = useState<Produit[]>([]);
  const [newProduit, setNewProduit] = useState({ nom: '', prix: '' });
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleAddProduit = () => {
    if (!newProduit.nom || !newProduit.prix) return;
    setProduits([...produits, {
      id: Date.now().toString(),
      nom: newProduit.nom,
      prix: parseFloat(newProduit.prix)
    }]);
    setNewProduit({ nom: '', prix: '' });
  };

  const handleRemoveProduit = (id: string) => {
    setProduits(produits.filter(p => p.id !== id));
  };

  const total = produits.reduce((sum, p) => sum + p.prix, 0);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = () => {
    if (mode === 'upload' && file) {
      onSubmit({ mode: 'upload', file, titre: titre || file.name, demandeur });
    } else if (mode === 'form' && titre && produits.length > 0) {
      onSubmit({ mode: 'form', titre, demandeur, description, produits, total });
    }
  };

  const canSubmit = mode === 'upload' ? !!file : (titre && produits.length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Nouvel État de Besoin</h2>
                <p className="text-emerald-100">Remplissez le formulaire ou uploadez un document</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setMode('form')}
            className={`flex-1 py-4 text-center font-medium transition-all ${
              mode === 'form' 
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            Remplir le formulaire
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`flex-1 py-4 text-center font-medium transition-all ${
              mode === 'upload' 
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Upload className="w-5 h-5 inline mr-2" />
            Uploader un document
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {mode === 'upload' ? (
            // Mode Upload
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                  dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 hover:border-emerald-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                      <File className="w-8 h-8 text-emerald-600" />
                    </div>
                    <p className="font-medium text-gray-800 text-lg">{file.name}</p>
                    <p className="text-gray-500 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                    <button
                      onClick={() => setFile(null)}
                      className="mt-4 text-red-500 hover:text-red-600 text-sm"
                    >
                      Supprimer et choisir un autre
                    </button>
                  </div>
                ) : (
                  <>
                    <FileUp className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600 text-lg mb-2">
                      Glissez votre document Word ou PDF ici
                    </p>
                    <p className="text-gray-400 mb-4">ou</p>
                    <label className="cursor-pointer">
                      <span className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors inline-block font-medium">
                        Parcourir les fichiers
                      </span>
                      <input
                        type="file"
                        onChange={(e) => e.target.files && setFile(e.target.files[0])}
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                      />
                    </label>
                  </>
                )}
              </div>
              
              {file && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Votre nom
                  </label>
                  <input
                    type="text"
                    value={demandeur}
                    onChange={(e) => setDemandeur(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    placeholder="Votre nom"
                  />
                </div>
              )}
            </div>
          ) : (
            // Mode Formulaire
            <div className="space-y-5">
              {/* Titre */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                  placeholder="Ex: Fournitures de bureau"
                />
              </div>

              {/* Demandeur */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Votre nom *
                </label>
                <input
                  type="text"
                  value={demandeur}
                  onChange={(e) => setDemandeur(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                  placeholder="Votre nom complet"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all"
                  rows={2}
                  placeholder="Description du besoin..."
                />
              </div>

              {/* Produits */}
              <div className="bg-gray-50 rounded-2xl p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  Produits / Articles *
                </h3>

                {/* Liste des produits ajoutés */}
                {produits.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {produits.map((p) => (
                      <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm">
                        <span className="font-medium text-gray-700">{p.nom}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-emerald-600">${p.prix.toLocaleString('fr-FR')}</span>
                          <button
                            onClick={() => handleRemoveProduit(p.id)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-gray-300">
                      <span className="font-bold text-gray-700">Total</span>
                      <span className="text-2xl font-bold text-emerald-600">${total.toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                )}

                {/* Formulaire ajout produit */}
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newProduit.nom}
                    onChange={(e) => setNewProduit({ ...newProduit, nom: e.target.value })}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    placeholder="Nom du produit"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddProduit()}
                  />
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={newProduit.prix}
                      onChange={(e) => setNewProduit({ ...newProduit, prix: e.target.value })}
                      className="w-32 pl-8 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                      placeholder="Prix"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddProduit()}
                    />
                  </div>
                  <button
                    onClick={handleAddProduit}
                    disabled={!newProduit.nom || !newProduit.prix}
                    className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !canSubmit}
            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-emerald-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Soumettre
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal visualisation document
function DocumentViewerModal({
  isOpen,
  onClose,
  url,
  name
}: {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  name: string;
}) {
  if (!isOpen) return null;

  const isPdf = url.toLowerCase().endsWith('.pdf');
  const viewerUrl = isPdf ? url : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(window.location.origin + url)}`;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            {name}
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download={name}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              Télécharger
            </a>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1">
          <iframe
            src={viewerUrl}
            className="w-full h-full"
            title={name}
          />
        </div>
      </div>
    </div>
  );
}

// Page principale
export default function EtatDeBesoinsPage() {
  const { user, isAuthenticated } = useCodeAuth();
  const router = useRouter();
  const [besoins, setBesoins] = useState<EtatBesoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [viewerModal, setViewerModal] = useState<{ url: string; name: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'soumis' | 'approuve' | 'rejete'>('all');

  // Vérifier les permissions
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const userRole = user.role?.toLowerCase() || '';
    const userCompany = user.company?.toLowerCase() || '';
    const userLevel = user.level || 0;

    const hasRoleAccess = ROLES_AUTORISES.some(role => 
      userRole.includes(role) || userCompany.includes(role)
    );
    const hasLevelAccess = NIVEAUX_AUTORISES.includes(userLevel);

    if (!hasRoleAccess && !hasLevelAccess) {
      setAccessDenied(true);
      setLoading(false);
    } else {
      setAccessDenied(false);
      loadBesoins();
    }
  }, [isAuthenticated, user]);

  const loadBesoins = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/besoins');
      if (response.ok) {
        const data = await response.json();
        setBesoins(data.besoins || data || []);
      } else {
        // Données de démonstration
        setBesoins([
          {
            id: '1',
            reference: 'EB-001',
            titre: 'Fournitures informatiques',
            demandeur: 'Jean Dupont',
            description: 'Achat de matériel pour le service IT',
            produits: [
              { id: '1', nom: 'Clavier sans fil', prix: 45 },
              { id: '2', nom: 'Souris ergonomique', prix: 35 },
              { id: '3', nom: 'Écran 27 pouces', prix: 320 }
            ],
            total: 400,
            statut: 'soumis',
            dateCreation: new Date().toISOString()
          },
          {
            id: '2',
            reference: 'EB-002',
            titre: 'Mobilier bureau',
            demandeur: 'Marie Martin',
            description: '',
            produits: [],
            total: 0,
            statut: 'approuve',
            dateCreation: new Date(Date.now() - 86400000).toISOString(),
            documentUrl: '/uploads/besoins/exemple.pdf',
            documentName: 'Etat_besoin_mobilier.pdf',
            isDocumentOnly: true
          },
          {
            id: '3',
            reference: 'EB-003',
            titre: 'Véhicule de service',
            demandeur: 'Pierre Durand',
            description: 'Demande d\'achat d\'un véhicule utilitaire',
            produits: [
              { id: '1', nom: 'Véhicule utilitaire', prix: 25000 }
            ],
            total: 25000,
            statut: 'rejete',
            dateCreation: new Date(Date.now() - 172800000).toISOString()
          },
          {
            id: '4',
            reference: 'EB-004',
            titre: 'Équipements de sécurité',
            demandeur: 'Sophie Leroy',
            description: 'Achat EPI pour l\'équipe',
            produits: [
              { id: '1', nom: 'Casques de chantier', prix: 150 },
              { id: '2', nom: 'Gilets fluorescents', prix: 80 },
              { id: '3', nom: 'Chaussures sécurité', prix: 200 }
            ],
            total: 430,
            statut: 'soumis',
            dateCreation: new Date(Date.now() - 43200000).toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      
      if (data.mode === 'upload') {
        formData.append('file', data.file);
        formData.append('data', JSON.stringify({
          titre: data.titre,
          demandeur: data.demandeur,
          isDocumentOnly: true
        }));
      } else {
        formData.append('data', JSON.stringify({
          titre: data.titre,
          demandeur: data.demandeur,
          description: data.description,
          produits: data.produits,
          total: data.total,
          isDocumentOnly: false
        }));
      }

      const response = await fetch('/api/besoins', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const newBesoin = await response.json();
        setBesoins([newBesoin, ...besoins]);
      } else {
        // Simulation
        const newBesoin: EtatBesoin = {
          id: Date.now().toString(),
          reference: `EB-${Date.now().toString(36).toUpperCase().slice(-4)}`,
          titre: data.titre,
          demandeur: data.demandeur,
          description: data.description || '',
          produits: data.produits || [],
          total: data.total || 0,
          statut: 'soumis',
          dateCreation: new Date().toISOString(),
          isDocumentOnly: data.mode === 'upload',
          documentName: data.file?.name,
          documentUrl: data.file ? '#' : undefined
        };
        setBesoins([newBesoin, ...besoins]);
      }
      setShowCreateModal(false);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet état de besoin ?')) return;
    try {
      await fetch(`/api/besoins/${id}`, { method: 'DELETE' });
      setBesoins(besoins.filter(b => b.id !== id));
    } catch (error) {
      setBesoins(besoins.filter(b => b.id !== id));
    }
  };

  const filteredBesoins = besoins.filter(b => {
    const matchSearch = b.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.demandeur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = activeFilter === 'all' || b.statut === activeFilter;
    return matchSearch && matchFilter;
  });

  // Statistiques
  const stats = {
    total: besoins.length,
    soumis: besoins.filter(b => b.statut === 'soumis').length,
    approuve: besoins.filter(b => b.statut === 'approuve').length,
    rejete: besoins.filter(b => b.statut === 'rejete').length
  };

  // Page accès refusé
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md text-center">
          <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Accès Restreint</h1>
          <p className="text-gray-600 mb-6">
            Cette section est réservée aux utilisateurs autorisés :
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <ul className="text-left text-sm text-gray-600 space-y-2">
              <li className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                Direction Générale (DG)
              </li>
              <li className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                Service Financier
              </li>
              <li className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-500" />
                Administration
              </li>
            </ul>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
          >
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Receipt className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">États de Besoin</h1>
                <p className="text-emerald-100">Gérez vos demandes d&apos;achat</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white text-emerald-600 rounded-xl hover:bg-emerald-50 transition-colors font-semibold shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Nouveau
            </button>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 cursor-pointer hover:bg-white/20 transition-all"
                 onClick={() => setActiveFilter('all')}>
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-white/80" />
                <div>
                  <div className="text-3xl font-bold">{stats.total}</div>
                  <div className="text-emerald-100 text-sm">Total</div>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 cursor-pointer hover:bg-white/20 transition-all"
                 onClick={() => setActiveFilter('soumis')}>
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-300" />
                <div>
                  <div className="text-3xl font-bold">{stats.soumis}</div>
                  <div className="text-emerald-100 text-sm">En attente</div>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 cursor-pointer hover:bg-white/20 transition-all"
                 onClick={() => setActiveFilter('approuve')}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-300" />
                <div>
                  <div className="text-3xl font-bold">{stats.approuve}</div>
                  <div className="text-emerald-100 text-sm">Approuvés</div>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 cursor-pointer hover:bg-white/20 transition-all"
                 onClick={() => setActiveFilter('rejete')}>
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-300" />
                <div>
                  <div className="text-3xl font-bold">{stats.rejete}</div>
                  <div className="text-emerald-100 text-sm">Rejetés</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Onglets de filtrage */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: 'all', label: 'Tous', count: stats.total, color: 'gray' },
            { key: 'soumis', label: 'En attente', count: stats.soumis, color: 'blue' },
            { key: 'approuve', label: 'Approuvés', count: stats.approuve, color: 'green' },
            { key: 'rejete', label: 'Rejetés', count: stats.rejete, color: 'red' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                activeFilter === tab.key
                  ? tab.color === 'gray' ? 'bg-gray-800 text-white' :
                    tab.color === 'blue' ? 'bg-blue-500 text-white' :
                    tab.color === 'green' ? 'bg-green-500 text-white' :
                    'bg-red-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
              }`}
            >
              {tab.key === 'all' && <FileText className="w-4 h-4" />}
              {tab.key === 'soumis' && <Clock className="w-4 h-4" />}
              {tab.key === 'approuve' && <CheckCircle2 className="w-4 h-4" />}
              {tab.key === 'rejete' && <XCircle className="w-4 h-4" />}
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeFilter === tab.key ? 'bg-white/20' : 'bg-gray-100'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Barre de recherche */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-0 shadow-sm focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          </div>
        ) : filteredBesoins.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun état de besoin</h3>
            <p className="text-gray-500 mb-6">Créez votre premier état de besoin</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Créer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredBesoins.map((besoin) => (
              <EtatBesoinCard
                key={besoin.id}
                besoin={besoin}
                onDelete={handleDelete}
                onViewDoc={(url, name) => setViewerModal({ url, name })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        userName={user?.name || ''}
      />

      {viewerModal && (
        <DocumentViewerModal
          isOpen={true}
          onClose={() => setViewerModal(null)}
          url={viewerModal.url}
          name={viewerModal.name}
        />
      )}
    </div>
  );
}
