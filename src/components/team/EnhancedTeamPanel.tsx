"use client";

import { useState, useEffect } from "react";
import { Users, Crown, Shield, UserCheck, User, MessageCircle, CheckSquare, Eye, Settings } from "lucide-react";
import type { TeamMember, CompanyRole } from "@/lib/app-types";

interface EnhancedTeamPanelProps {
  currentUser: {
    id: string;
    name: string;
    role: CompanyRole;
    email: string;
  };
  onMemberClick?: (member: TeamMember) => void;
  onAssignTask?: (memberId: string) => void;
  onStartChat?: (memberId: string) => void;
}

export default function EnhancedTeamPanel({ currentUser, onMemberClick, onAssignTask, onStartChat }: EnhancedTeamPanelProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  // Hiérarchie des rôles (du plus haut au plus bas)
  const roleHierarchy = {
    directeur: { level: 4, name: 'Directeur Général', icon: Crown, color: 'text-yellow-600 bg-yellow-100' },
    manager: { level: 3, name: 'Manager', icon: Shield, color: 'text-blue-600 bg-blue-100' },
    assistant: { level: 2, name: 'Assistant', icon: UserCheck, color: 'text-green-600 bg-green-100' },
    employe: { level: 1, name: 'Employé', icon: User, color: 'text-gray-600 bg-gray-100' }
  };

  // Charger la liste des membres
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const response = await fetch('/api/team/members');
        const data = await response.json();
        
        if (response.ok) {
          setMembers(data.members || []);
        } else {
          console.error('Erreur chargement équipe:', data.error);
          // Données de test en cas d'erreur
          setMembers([
            {
              id: 'dir-001',
              name: 'Marie Dubois',
              email: 'marie.dubois@company.com',
              role: 'directeur',
              title: 'Directrice Générale',
              department: 'Direction',
              isOnline: true,
              lastSeen: new Date().toISOString()
            },
            {
              id: 'mgr-001',
              name: 'Pierre Martin',
              email: 'pierre.martin@company.com',
              role: 'manager',
              title: 'Responsable Commercial',
              department: 'Ventes',
              isOnline: true,
              lastSeen: new Date(Date.now() - 5 * 60000).toISOString()
            },
            {
              id: 'ast-001',
              name: 'Sophie Leroy',
              email: 'sophie.leroy@company.com',
              role: 'assistant',
              title: 'Assistante Administrative',
              department: 'Administration',
              isOnline: false,
              lastSeen: new Date(Date.now() - 30 * 60000).toISOString()
            },
            {
              id: 'emp-001',
              name: 'Thomas Durand',
              email: 'thomas.durand@company.com',
              role: 'employe',
              title: 'Commercial',
              department: 'Ventes',
              isOnline: true,
              lastSeen: new Date().toISOString()
            },
            {
              id: 'emp-002',
              name: 'Julie Bernard',
              email: 'julie.bernard@company.com',
              role: 'employe',
              title: 'Comptable',
              department: 'Finance',
              isOnline: false,
              lastSeen: new Date(Date.now() - 2 * 60 * 60000).toISOString()
            }
          ]);
        }
      } catch (error) {
        console.error('Erreur réseau:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
    
    // Actualiser toutes les 30 secondes
    const interval = setInterval(loadMembers, 30000);
    return () => clearInterval(interval);
  }, []);

  // Trier les membres par hiérarchie puis par nom
  const sortedMembers = [...members].sort((a, b) => {
    const levelA = roleHierarchy[a.role]?.level || 0;
    const levelB = roleHierarchy[b.role]?.level || 0;
    
    if (levelA !== levelB) {
      return levelB - levelA; // Ordre décroissant (directeur en premier)
    }
    
    return a.name.localeCompare(b.name);
  });

  // Déterminer les permissions de l'utilisateur actuel
  const currentUserLevel = roleHierarchy[currentUser.role]?.level || 0;
  const canAssignTasks = currentUser.role === 'directeur' || currentUser.role === 'manager';
  const canViewAll = currentUser.role === 'directeur';

  const formatLastSeen = (lastSeen: string) => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days}j`;
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-green-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-800">Équipe</h2>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {members.filter(m => m.isOnline).length}/{members.length} en ligne
            </span>
          </div>
          
          {canViewAll && (
            <button className="p-2 hover:bg-blue-100 rounded-lg transition-colors">
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          Votre rôle: {roleHierarchy[currentUser.role]?.name}
        </div>
      </div>

      {/* Liste des membres */}
      <div className="flex-1 overflow-auto p-2 space-y-2">
        {sortedMembers.map((member) => {
          const roleInfo = roleHierarchy[member.role] || roleHierarchy.employe;
          const IconComponent = roleInfo.icon;
          const isCurrentUser = member.id === currentUser.id;
          
          return (
            <div
              key={member.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                isCurrentUser ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => {
                setSelectedMember(member);
                onMemberClick?.(member);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar et statut */}
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${roleInfo.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      member.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>

                  {/* Informations */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-800 truncate">
                        {member.name}
                        {isCurrentUser && <span className="text-blue-600 text-sm">(Vous)</span>}
                      </h3>
                    </div>
                    
                    <div className="text-sm text-gray-600 truncate">{member.title}</div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{roleInfo.name}</span>
                      {member.department && (
                        <>
                          <span>•</span>
                          <span>{member.department}</span>
                        </>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      {member.isOnline ? 'En ligne' : formatLastSeen(member.lastSeen || '')}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {!isCurrentUser && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartChat?.(member.id);
                      }}
                      className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Démarrer une conversation"
                    >
                      <MessageCircle className="w-4 h-4 text-blue-600" />
                    </button>
                    
                    {canAssignTasks && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssignTask?.(member.id);
                        }}
                        className="p-1.5 hover:bg-green-100 rounded-lg transition-colors"
                        title="Assigner une tâche"
                      >
                        <CheckSquare className="w-4 h-4 text-green-600" />
                      </button>
                    )}
                    
                    {canViewAll && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Ouvrir le profil détaillé
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Voir le profil"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Résumé des permissions */}
      <div className="p-3 border-t bg-gray-50 text-xs text-gray-600">
        <div className="space-y-1">
          {canViewAll && <div>✅ Vue globale de l'équipe</div>}
          {canAssignTasks && <div>✅ Attribution de tâches</div>}
          <div>✅ Communication par chat</div>
          {!canAssignTasks && !canViewAll && (
            <div>ℹ️ Permissions limitées au rôle {roleHierarchy[currentUser.role]?.name}</div>
          )}
        </div>
      </div>
    </div>
  );
}
