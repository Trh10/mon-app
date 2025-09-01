"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle, Eye, DollarSign, Calendar, User, FileText, TrendingUp } from 'lucide-react';
import { useCodeAuth } from '@/components/auth/CodeAuthContext';

interface WorkflowInfo {
  totalSteps: number;
  completedSteps: number;
  progress: number;
  nextApprover: {
    name: string;
    level: number;
  } | null;
  lastApprover: {
    name: string;
    level: number;
    action: string;
    comment?: string;
    date?: string;
  } | null;
  approvalHistory: Array<{
    approver: string;
    level: number;
    action: string;
    comment?: string;
    date?: string;
  }>;
}

interface UserRequisition {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  budget: number;
  justification: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  workflowInfo: WorkflowInfo;
}

interface Stats {
  total: number;
  en_attente: number;
  en_review: number;
  approuvees: number;
  rejetees: number;
  budget_total: number;
  budget_approuve: number;
}

const STATUS_COLORS = {
  'soumis': 'bg-blue-100 text-blue-800',
  'en_review': 'bg-yellow-100 text-yellow-800',
  'approuve': 'bg-green-100 text-green-800',
  'rejete': 'bg-red-100 text-red-800'
};

const STATUS_LABELS = {
  'soumis': 'En attente',
  'en_review': 'En révision',
  'approuve': 'Approuvée',
  'rejete': 'Rejetée'
};

const PRIORITY_COLORS = {
  'faible': 'bg-gray-100 text-gray-800',
  'moyenne': 'bg-blue-100 text-blue-800',
  'haute': 'bg-orange-100 text-orange-800',
  'urgente': 'bg-red-100 text-red-800'
};

const CATEGORY_LABELS = {
  'materiel': 'Matériel',
  'logiciel': 'Logiciel', 
  'formation': 'Formation',
  'service': 'Service',
  'fourniture': 'Fourniture'
};

export default function MyRequestsPage() {
  const { user } = useCodeAuth();
  const [requisitions, setRequisitions] = useState<UserRequisition[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRequisition, setSelectedRequisition] = useState<UserRequisition | null>(null);

  useEffect(() => {
    if (user) {
      fetchMyRequests();
    }
  }, [user]);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/requisitions/my-requests');
      
      if (response.ok) {
        const data = await response.json();
        setRequisitions(data.data.requisitions);
        setStats(data.data.stats);
      } else {
        console.error('Erreur lors de la récupération des réquisitions');
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
    } finally {
      setLoading(false);
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
    return new Date(dateString).toLocaleDateString('en-US');
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">Connexion requise</h2>
          <p className="text-yellow-600">
            Veuillez vous connecter pour voir vos réquisitions.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">Chargement de vos réquisitions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes Réquisitions</h1>
          <p className="text-gray-600 mt-1">
            Suivez le statut de vos demandes d'achat
          </p>
        </div>
        <button
          onClick={fetchMyRequests}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Chargement...' : 'Actualiser'}
        </button>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                <p className="text-blue-600 text-sm">Total demandes</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-green-900">{stats.approuvees}</p>
                <p className="text-green-600 text-sm">Approuvées</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-yellow-900">{stats.en_review + stats.en_attente}</p>
                <p className="text-yellow-600 text-sm">En cours</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-purple-900">{formatBudget(stats.budget_approuve)}</p>
                <p className="text-purple-600 text-sm">Budget approuvé</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste des réquisitions */}
      {requisitions.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucune réquisition</h3>
          <p className="text-gray-500">
            Vous n'avez pas encore soumis de réquisitions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requisitions.map((requisition) => (
            <div key={requisition.id} className="bg-white border rounded-lg shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{requisition.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[requisition.status as keyof typeof STATUS_COLORS]}`}>
                      {STATUS_LABELS[requisition.status as keyof typeof STATUS_LABELS]}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[requisition.priority as keyof typeof PRIORITY_COLORS]}`}>
                      {requisition.priority}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{requisition.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold text-gray-900">{formatBudget(requisition.budget)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{CATEGORY_LABELS[requisition.category as keyof typeof CATEGORY_LABELS]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(requisition.createdAt)}</span>
                    </div>
                  </div>

                  {/* Barre de progression du workflow */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Progression d'approbation</span>
                      <span>{requisition.workflowInfo.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${requisition.workflowInfo.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Statut d'approbation actuel */}
                  {requisition.workflowInfo.nextApprover && (
                    <div className="bg-blue-50 p-3 rounded-md mb-3">
                      <p className="text-sm font-medium text-blue-800">
                        🔄 En attente d'approbation par : {requisition.workflowInfo.nextApprover.name}
                      </p>
                    </div>
                  )}

                  {/* Dernière action */}
                  {requisition.workflowInfo.lastApprover && (
                    <div className={`p-3 rounded-md mb-3 ${
                      requisition.workflowInfo.lastApprover.action === 'approved' ? 'bg-green-50' :
                      requisition.workflowInfo.lastApprover.action === 'rejected' ? 'bg-red-50' : 'bg-yellow-50'
                    }`}>
                      <p className={`text-sm font-medium ${
                        requisition.workflowInfo.lastApprover.action === 'approved' ? 'text-green-800' :
                        requisition.workflowInfo.lastApprover.action === 'rejected' ? 'text-red-800' : 'text-yellow-800'
                      }`}>
                        {requisition.workflowInfo.lastApprover.action === 'approved' && '✅ Approuvé par : '}
                        {requisition.workflowInfo.lastApprover.action === 'rejected' && '❌ Rejeté par : '}
                        {requisition.workflowInfo.lastApprover.action === 'requested_info' && '❓ Info demandée par : '}
                        {requisition.workflowInfo.lastApprover.name}
                      </p>
                      {requisition.workflowInfo.lastApprover.comment && (
                        <p className="text-sm text-gray-600 mt-1">
                          "{requisition.workflowInfo.lastApprover.comment}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Message spécial pour approbation finale */}
                  {requisition.status === 'approuve' && (
                    <div className="bg-green-100 border border-green-300 p-4 rounded-md">
                      <div className="flex items-center mb-1">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <span className="font-semibold text-green-800">
                          🎉 Votre demande a été approuvée définitivement !
                        </span>
                      </div>
                      <p className="text-green-700 text-sm mt-1">
                        Approbation finale le {requisition.workflowInfo.lastApprover?.date ? formatDate(requisition.workflowInfo.lastApprover.date) : ''} par {requisition.workflowInfo.lastApprover?.name}.
                      </p>
                      <p className="text-green-700 text-sm mt-1">
                        Vous pouvez télécharger le document d'approbation ou l'imprimer pour le présenter à la finance ou à l'administration.
                      </p>
                      <a
                        href={`/api/requisitions/pdf?id=${requisition.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                      >
                        Télécharger le PDF d'approbation
                      </a>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedRequisition(requisition)}
                  className="ml-4 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Détails
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de détails */}
      {selectedRequisition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">{selectedRequisition.title}</h3>
                <button
                  onClick={() => setSelectedRequisition(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Historique d'approbation</h4>
                  {selectedRequisition.workflowInfo.approvalHistory.length === 0 ? (
                    <p className="text-gray-500 text-sm">Aucune approbation pour le moment</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedRequisition.workflowInfo.approvalHistory.map((approval, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-md">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                            approval.action === 'approved' ? 'bg-green-500' : 
                            approval.action === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}>
                            {approval.action === 'approved' ? '✓' : 
                             approval.action === 'rejected' ? '✗' : '?'}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{approval.approver}</p>
                            <p className="text-sm text-gray-600">
                              {approval.action === 'approved' && 'A approuvé'}
                              {approval.action === 'rejected' && 'A rejeté'}
                              {approval.action === 'requested_info' && 'A demandé des informations'}
                            </p>
                            {approval.comment && (
                              <p className="text-sm text-gray-500 mt-1">"{approval.comment}"</p>
                            )}
                            {approval.date && (
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDate(approval.date)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Justification</h4>
                  <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-md">
                    {selectedRequisition.justification}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
