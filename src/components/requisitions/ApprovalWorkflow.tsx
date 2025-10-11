"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, MessageCircle, Clock, DollarSign, User, Calendar } from 'lucide-react';
import { useCodeAuth } from '@/components/auth/CodeAuthContext';
import {
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  canAccessRequisitions
} from '@/lib/requisitions/requisition-types';

interface PendingReview {
  requisitionId: string;
  requisitionTitle: string;
  requisitionDescription: string;
  category: string;
  priority: string;
  budget: number;
  justification: string;
  requesterName: string;
  requesterId: string;
  createdAt: string;
  workflowStepId: string;
  currentStep: any;
  allSteps: any[];
  isFirstApproval: boolean;
  previousApprovals: any[];
  totalSteps: number;
}

interface WorkflowStats {
  pendingCount: number;
  totalRequisitions: number;
  byPriority: {
    urgente: number;
    haute: number;
    moyenne: number;
    faible: number;
  };
  byBudgetRange: {
    small: number;
    medium: number;
    large: number;
  };
  approvedTotalThisMonth?: number;
  approvedListThisMonth?: Array<{
    id: string;
    titre: string;
    montant: number;
    date: string;
    approbateur: string;
  }>;
}

export default function ApprovalWorkflow() {
  const { user } = useCodeAuth();
  const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [selectedRequisition, setSelectedRequisition] = useState<PendingReview | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [actionType, setActionType] = useState<'approved' | 'rejected' | 'requested_info' | null>(null);

  // Définir la fonction de chargement AVANT tout retour conditionnel
  const fetchPendingReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/requisitions/workflow');
      if (response.ok) {
        const data = await response.json();
        setPendingReviews(data.pendingReviews);
        setStats(data.stats);
      } else {
        console.error('Erreur lors de la récupération des révisions');
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toujours appeler les hooks en haut du composant
  useEffect(() => {
    fetchPendingReviews();
  }, []);

  // Vérifier les permissions d'accès
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <XCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Utilisateur non connecté</h2>
          <p className="text-yellow-600">
            Veuillez vous connecter avec un code d'entreprise pour accéder aux approbations.
          </p>
        </div>
      </div>
    );
  }

  if (!canAccessRequisitions(user.level || 0)) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Accès non autorisé</h2>
          <p className="text-red-600">
            Seuls les responsables Finance (niveau 6), Administration (niveau 7) et Direction (niveau 10) 
            peuvent consulter et approuver les réquisitions.
          </p>
          <p className="text-sm text-red-500 mt-2">
            Votre niveau actuel : {user?.level} - {user?.levelName}
          </p>
        </div>
      </div>
    );
  }

  

  const handleApprovalAction = async (requisitionId: string, action: 'approved' | 'rejected' | 'requested_info') => {
    if (processingAction) return;

    try {
      setProcessingAction(requisitionId);

      const response = await fetch('/api/requisitions/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requisitionId,
          action,
          comment: actionComment
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Afficher un message de succès
        alert(data.message);
        
        // Rafraîchir la liste
        await fetchPendingReviews();
        
        // Réinitialiser le formulaire
        setSelectedRequisition(null);
        setActionComment('');
        setActionType(null);
      } else {
        const errorData = await response.json();
        alert(`Erreur: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'action:', error);
      alert('Erreur lors de l\'action');
    } finally {
      setProcessingAction(null);
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Clock className="mx-auto h-8 w-8 text-gray-400 animate-spin mb-4" />
            <p className="text-gray-600">Chargement des réquisitions en attente...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header avec statistiques */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Approbation des Réquisitions</h1>
        <p className="text-gray-600 mb-6">
          Niveau d'approbation : <span className="font-semibold">{user.levelName}</span> (Niveau {user.level})
        </p>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-blue-900">{stats.pendingCount}</p>
                  <p className="text-blue-600 text-sm">En attente</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-green-900">{stats.totalRequisitions}</p>
                  <p className="text-green-600 text-sm">Total réquisitions</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-red-900">{stats.byPriority.urgente}</p>
                  <p className="text-red-600 text-sm">Urgentes</p>
                </div>
              </div>
            </div>


            {(user.level === 10 || user.level === 6) && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <p className="text-2xl font-bold text-purple-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(stats.approvedTotalThisMonth || 0)}</p>
                    <p className="text-purple-600 text-sm">Total approuvé ce mois</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approbations du mois (DG et Finance uniquement) */}
      {(user.level === 10 || user.level === 6) && stats?.approvedListThisMonth && stats.approvedListThisMonth.length > 0 && (
        <div className="bg-white border border-purple-200 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-purple-800">Approbations de ce mois</h2>
            <a
              href="/api/requisitions/pdf/month"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Exporter le mois en PDF
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-700">
                  <th className="px-2 py-1">Objet</th>
                  <th className="px-2 py-1">Montant</th>
                  <th className="px-2 py-1">Date</th>
                  <th className="px-2 py-1">Approbateur</th>
                  <th className="px-2 py-1">PDF</th>
                </tr>
              </thead>
              <tbody>
                {stats.approvedListThisMonth.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-2 py-1 font-medium">{item.titre}</td>
                    <td className="px-2 py-1">{formatBudget(item.montant)}</td>
                    <td className="px-2 py-1">{formatDate(item.date)}</td>
                    <td className="px-2 py-1">{item.approbateur}</td>
                    <td className="px-2 py-1">
                      <a
                        href={`/api/requisitions/pdf?id=${item.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-700 hover:underline"
                      >
                        Télécharger
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Liste des réquisitions en attente */}
      {pendingReviews.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold text-green-800 mb-2">Aucune réquisition en attente</h3>
          <p className="text-green-600">
            Toutes les réquisitions relevant de votre niveau d'approbation ont été traitées.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Réquisitions en attente d'approbation ({pendingReviews.length})
          </h2>

          {pendingReviews.map((review) => (
            <div key={review.requisitionId} className="bg-white border rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{review.requisitionTitle}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[review.priority as keyof typeof PRIORITY_COLORS]}`}>
                      {PRIORITY_LABELS[review.priority as keyof typeof PRIORITY_LABELS]}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {CATEGORY_LABELS[review.category as keyof typeof CATEGORY_LABELS]}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{review.requisitionDescription}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold text-gray-900">{formatBudget(review.budget)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{review.requesterName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(review.createdAt)}</span>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-700 mb-1">Justification :</p>
                    <p className="text-sm text-gray-600">{review.justification}</p>
                  </div>

                  {review.previousApprovals.length > 0 && (
                    <div className="mt-3 p-3 bg-green-50 rounded-md">
                      <p className="text-sm font-medium text-green-700 mb-2">Approbations précédentes :</p>
                      {review.previousApprovals.map((approval: any, index: number) => (
                        <div key={index} className="text-sm text-green-600">
                          ✓ {approval.reviewerName} - {approval.comment || 'Approuvé'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions d'approbation */}
              <div className="border-t pt-4">
                {selectedRequisition?.requisitionId === review.requisitionId ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Commentaire (optionnel)
                      </label>
                      <textarea
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Ajoutez un commentaire sur votre décision..."
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprovalAction(review.requisitionId, 'approved')}
                        disabled={processingAction === review.requisitionId}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approuver
                      </button>
                      
                      <button
                        onClick={() => handleApprovalAction(review.requisitionId, 'rejected')}
                        disabled={processingAction === review.requisitionId}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Rejeter
                      </button>
                      
                      <button
                        onClick={() => handleApprovalAction(review.requisitionId, 'requested_info')}
                        disabled={processingAction === review.requisitionId}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Demander info
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedRequisition(null);
                          setActionComment('');
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedRequisition(review);
                      setActionComment('');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Examiner et décider
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
