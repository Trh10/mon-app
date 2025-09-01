"use client";

import { useEffect, useState } from "react";
import { useCodeAuth } from "@/components/auth/CodeAuthContext";
import { 
  Requisition, 
  CreateRequisitionData, 
  CATEGORY_LABELS, 
  PRIORITY_LABELS, 
  STATUS_LABELS, 
  PRIORITY_COLORS, 
  STATUS_COLORS 
} from "@/lib/requisitions/requisition-types";
import { Plus, Clock, CheckCircle, XCircle, FileText, DollarSign, Calendar, User, Building, ArrowLeft, X, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";

// Composant FilterButton
function FilterButton({ 
  children, 
  active, 
  onClick, 
  count 
}: { 
  children: React.ReactNode; 
  active: boolean; 
  onClick: () => void; 
  count: number; 
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
        active 
          ? 'bg-blue-600 text-white' 
          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
      }`}
    >
      {children}
      <span className={`px-2 py-1 rounded-full text-xs ${
        active ? 'bg-blue-500' : 'bg-gray-200'
      }`}>
        {count}
      </span>
    </button>
  );
}

// Composant RequisitionCard
function RequisitionCard({ requisition, onUpdate, currentUser }: { 
  requisition: Requisition; 
  onUpdate: () => void; 
  currentUser: any; 
}) {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = currentUser && requisition.requesterId === currentUser.id && 
    ['brouillon', 'soumis'].includes(requisition.status);

  const handleDelete = async () => {
    if (!canDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/requisitions?id=${requisition.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        onUpdate(); // Rafraîchir la liste
        setShowDeleteConfirm(false);
      } else {
        alert('Erreur lors de la suppression: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{requisition.title}</h3>
          <p className="text-gray-600 mb-3">{requisition.description}</p>
          
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="font-medium">${requisition.budget.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <User className="w-4 h-4 text-gray-400" />
              <span>{requisition.requesterId}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{new Date(requisition.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[requisition.status]}`}>
              {STATUS_LABELS[requisition.status]}
            </div>
            
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                title="Supprimer la réquisition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[requisition.priority]}`}>
            {PRIORITY_LABELS[requisition.priority]}
          </div>
          
          <div className="text-xs text-gray-500">
            {CATEGORY_LABELS[requisition.category]}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t pt-4 mt-4">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Justification</h4>
            <p className="text-gray-600">{requisition.justification}</p>
          </div>
          
          {requisition.workflow.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Workflow d'approbation</h4>
              <div className="space-y-2">
                {requisition.workflow.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-3 text-sm">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      step.isCompleted 
                        ? step.action === 'approved' 
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {step.isCompleted ? (
                        step.action === 'approved' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium">{step.reviewerName}</div>
                      {step.comment && (
                        <div className="text-gray-600 italic">"{step.comment}"</div>
                      )}
                    </div>
                    
                    <div className="text-gray-500">
                      {step.completedAt ? new Date(step.completedAt).toLocaleDateString() : 'En attente'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        {expanded ? 'Masquer les détails' : 'Voir les détails'}
      </button>

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Supprimer la réquisition</h3>
                  <p className="text-sm text-gray-600">Cette action est irréversible</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Êtes-vous sûr de vouloir supprimer la réquisition <strong>"{requisition.title}"</strong> ?
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant CreateRequisitionModal
function CreateRequisitionModal({ 
  onClose, 
  onSubmit 
}: { 
  onClose: () => void; 
  onSubmit: (data: CreateRequisitionData) => void; 
}) {
  const [formData, setFormData] = useState<CreateRequisitionData>({
    title: '',
    description: '',
    category: 'materiel',
    priority: 'moyenne',
    budget: 0,
    justification: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Nouvelle Réquisition</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titre de la réquisition *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Nouvel ordinateur portable"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Décrivez en détail votre besoin..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priorité *
              </label>
              <select
                required
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget estimé ($) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.budget}
              onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value) || 0})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Justification *
            </label>
            <textarea
              required
              rows={3}
              value={formData.justification}
              onChange={(e) => setFormData({...formData, justification: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Expliquez pourquoi ce besoin est important..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Créer le besoin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RequisitionsPage() {
  const { user } = useCodeAuth();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine' | 'pending' | 'approved' | 'rejected'>('all');

  // Charger les réquisitions
  useEffect(() => {
    if (user) {
      loadRequisitions();
    }
  }, [user]);

  const loadRequisitions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/requisitions');
      const data = await response.json();
      
      if (data.success) {
        setRequisitions(data.requisitions);
      }
    } catch (error) {
      console.error('Erreur chargement réquisitions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les réquisitions selon le filtre sélectionné
  const filteredRequisitions = requisitions.filter(requisition => {
    switch (filter) {
      case 'mine':
        return requisition.requesterId === user?.id;
      case 'pending':
        return ['soumis', 'en_review'].includes(requisition.status);
      case 'approved':
        return requisition.status === 'approuve';
      case 'rejected':
        return requisition.status === 'rejete';
      default:
        return true;
    }
  });

  // Créer une nouvelle réquisition
  const handleCreateRequisition = async (requisitionData: CreateRequisitionData) => {
    try {
      const response = await fetch('/api/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requisitionData)
      });

      const data = await response.json();
      
      if (data.success) {
        setRequisitions([data.requisition, ...requisitions]);
        setShowCreateForm(false);
      } else {
        alert('Erreur: ' + data.message);
      }
    } catch (error) {
      console.error('Erreur création réquisition:', error);
      alert('Erreur lors de la création');
    }
  };

  if (!user) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4" />
                Retour
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">Réquisitions</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building className="w-4 h-4" />
                {user.companyCode}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                {user.name}
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Nouvelle Réquisition
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtres */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <FilterButton 
              active={filter === 'all'} 
              onClick={() => setFilter('all')}
              count={requisitions.length}
            >
              Toutes
            </FilterButton>
            <FilterButton 
              active={filter === 'mine'} 
              onClick={() => setFilter('mine')}
              count={requisitions.filter(r => r.requesterId === user.id).length}
            >
              Mes Réquisitions
            </FilterButton>
            <FilterButton 
              active={filter === 'pending'} 
              onClick={() => setFilter('pending')}
              count={requisitions.filter(r => ['soumis', 'en_review'].includes(r.status)).length}
            >
              En Attente
            </FilterButton>
            <FilterButton 
              active={filter === 'approved'} 
              onClick={() => setFilter('approved')}
              count={requisitions.filter(r => r.status === 'approuve').length}
            >
              Approuvées
            </FilterButton>
            <FilterButton 
              active={filter === 'rejected'} 
              onClick={() => setFilter('rejected')}
              count={requisitions.filter(r => r.status === 'rejete').length}
            >
              Rejetées
            </FilterButton>
          </div>
        </div>

        {/* Liste des réquisitions */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredRequisitions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune réquisition trouvée</h3>
            <p className="text-gray-500 mb-4">
              {filter === 'all' ? 'Aucune réquisition créée' : `Aucune réquisition dans la catégorie "${filter}"`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Créer la première réquisition
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredRequisitions.map(requisition => (
              <RequisitionCard 
                key={requisition.id} 
                requisition={requisition} 
                onUpdate={loadRequisitions} 
                currentUser={user}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de création */}
      {showCreateForm && (
        <CreateRequisitionModal 
          onClose={() => setShowCreateForm(false)}
          onSubmit={handleCreateRequisition}
        />
      )}
    </div>
  );
}
