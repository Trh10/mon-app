"use client";

import { useState, useEffect } from 'react';
import { useCodeAuth } from '@/components/auth/CodeAuthContext';
import { useNotification } from '@/components/notifications/NotificationProvider';
import { 
  Users, 
  Crown, 
  User, 
  Circle, 
  MessageCircle,
  ClipboardList,
  Settings,
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
  X
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  displayRole: string;
  level: number;
  isOnline: boolean;
  lastSeen?: string;
  activeTasks: number;
  completedTasks: number;
  companyId: string;
  joinedAt: string;
}

interface ModernTeamPanelProps {
  onClose?: () => void;
}

export default function ModernTeamPanel({ onClose }: ModernTeamPanelProps) {
  const { user } = useCodeAuth();
  const { playNotification } = useNotification();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showTaskAssign, setShowTaskAssign] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', isPrivate: false });
  const [loading, setLoading] = useState(true);

  // Charger les membres d'équipe depuis l'API
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!user?.companyId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/team/members?company=${encodeURIComponent(user.companyId)}`);
        const data = await response.json();
        
        if (data.success) {
          // Convertir la structure de l'API vers notre interface TeamMember
          const members: TeamMember[] = data.members.map((member: any) => ({
            id: member.id,
            name: member.name,
            role: member.role,
            displayRole: member.role,
            level: member.level,
            isOnline: member.status === 'online',
            lastSeen: member.lastSeen,
            activeTasks: 0, // À charger séparément si nécessaire
            completedTasks: 0, // À charger séparément si nécessaire
            companyId: member.company,
            joinedAt: member.joinedAt
          }));
          
          setTeamMembers(members);
        }
      } catch (error) {
        console.error('Erreur chargement équipe:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTeamMembers();
  }, [user?.companyId]);

  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member);
    setShowTaskAssign(false);
  };

  const handleSendPrivateMessage = (member: TeamMember) => {
    // Ouvrir chat privé avec ce membre
    console.log('Ouvrir chat privé avec:', member.name);
    // TODO: Implémenter l'ouverture du chat privé
  };

  const handleAssignTask = (member: TeamMember) => {
    // Vérifier les permissions
    if (!user?.permissions?.includes('assign_tasks')) {
      alert('Vous n\'avez pas les permissions pour assigner des tâches');
      return;
    }
    setSelectedMember(member);
    setShowTaskAssign(true);
  };

  const submitTask = async () => {
    if (!newTask.title.trim()) {
      alert('Veuillez saisir un titre pour la tâche');
      return;
    }

    if (!selectedMember || !user) {
      alert('Erreur: utilisateur ou membre sélectionné manquant');
      return;
    }

    try {
      const response = await fetch('/api/team/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          data: {
            title: newTask.title,
            description: newTask.description,
            assignedTo: selectedMember.id,
            assignedBy: user.id,
            isPrivate: newTask.isPrivate && user?.permissions?.includes('private_tasks'),
            priority: 'medium'
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        // Jouer le son de notification pour les tâches
        playNotification('task');
        
        // Réinitialiser
        setNewTask({ title: '', description: '', isPrivate: false });
        setShowTaskAssign(false);
        setSelectedMember(null);

        alert('Tâche assignée avec succès !');
      } else {
        alert('Erreur lors de l\'assignation: ' + result.error);
      }
    } catch (error) {
      console.error('Erreur assignation tâche:', error);
      alert('Erreur réseau lors de l\'assignation');
    }
  };

  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? 'text-green-500' : 'text-gray-400';
  };

  const getRoleIcon = (role: string) => {
    if (role.includes('Directeur')) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (role.includes('Administration') || role.includes('Financier')) return <Shield className="w-4 h-4 text-blue-500" />;
    return <User className="w-4 h-4 text-gray-500" />;
  };

  const canViewTasks = (member: TeamMember) => {
    // Le DG peut tout voir, les autres selon les permissions
    return user?.permissions?.includes('view_all') || member.id === user?.id;
  };

  const canAssignTasks = () => {
    return user?.permissions?.includes('assign_tasks');
  };

  return (
    <div className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto w-full sm:w-[420px] md:w-[480px] lg:w-[520px] bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Équipe - {user?.company}</h3>
            <span className="text-sm text-gray-500">({teamMembers.length} membres)</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Liste des membres */}
      <div className="flex-1 overflow-y-auto">
        {teamMembers.map((member) => (
          <div 
            key={member.id}
            className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => handleMemberClick(member)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Status en ligne */}
                <Circle className={`w-3 h-3 fill-current ${getStatusColor(member.isOnline)}`} />
                
                {/* Icône de rôle */}
                {getRoleIcon(member.role)}
                
                {/* Informations utilisateur */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{member.name}</span>
                    {member.id === user?.id && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Vous</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">{member.displayRole}</div>
                  {!member.isOnline && member.lastSeen && (
                    <div className="text-xs text-gray-400">
                      Dernière connexion: {new Date(member.lastSeen).toLocaleString()}
                    </div>
                  )}
                  {canViewTasks(member) && (
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {member.activeTasks} en cours
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {member.completedTasks} terminées
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {member.id !== user?.id && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendPrivateMessage(member);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Message privé"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    
                    {canAssignTasks() && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAssignTask(member);
                        }}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Assigner une tâche"
                      >
                        <ClipboardList className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Détails du membre sélectionné */}
      {selectedMember && !showTaskAssign && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-2">{selectedMember.name}</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div>Rôle: {selectedMember.displayRole}</div>
            <div>Statut: {selectedMember.isOnline ? '🟢 En ligne' : '🔴 Hors ligne'}</div>
            <div>Membre depuis: {new Date(selectedMember.joinedAt).toLocaleDateString()}</div>
            {canViewTasks(selectedMember) && (
              <div className="pt-2 border-t border-gray-200">
                <div>Tâches actives: {selectedMember.activeTasks}</div>
                <div>Tâches terminées: {selectedMember.completedTasks}</div>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 mt-3">
            {selectedMember.id !== user?.id && (
              <>
                <button
                  onClick={() => handleSendPrivateMessage(selectedMember)}
                  className="flex-1 bg-blue-100 text-blue-700 py-2 px-3 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                >
                  Message privé
                </button>
                {canAssignTasks() && (
                  <button
                    onClick={() => handleAssignTask(selectedMember)}
                    className="flex-1 bg-green-100 text-green-700 py-2 px-3 rounded-lg text-sm hover:bg-green-200 transition-colors"
                  >
                    Assigner tâche
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal d'assignation de tâche */}
      {showTaskAssign && selectedMember && (
        <div className="border-t border-gray-200 p-4 bg-blue-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Assigner une tâche à {selectedMember.name}</h4>
            <button
              onClick={() => setShowTaskAssign(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Titre de la tâche"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <textarea
              placeholder="Description détaillée..."
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              rows={2}
            />
            
            {user?.permissions?.includes('private_tasks') && (
              <label className="flex items-center gap-2 text-sm">
                <input 
                  type="checkbox" 
                  className="rounded"
                  checked={newTask.isPrivate}
                  onChange={(e) => setNewTask({ ...newTask, isPrivate: e.target.checked })}
                />
                <span>Tâche privée (visible uniquement par vous et l'assigné)</span>
              </label>
            )}
            
            <div className="flex gap-2">
              <button 
                onClick={submitTask}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Assigner
              </button>
              <button 
                onClick={() => setShowTaskAssign(false)}
                className="px-4 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
