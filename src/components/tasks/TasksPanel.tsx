"use client";

import { useEffect, useMemo, useState } from "react";
import { canAssignTaskTo, getAssignableUsers, UserRole, getRoleDisplayName } from "@/lib/permissions";
import { 
  X, Plus, CheckSquare, Clock, Activity, Target, Calendar, AlertCircle, 
  TrendingUp, Users, Edit3, Trash2, CheckCircle, FolderKanban, Search
} from "lucide-react";

type Role = UserRole;
type Member = { id: string; name: string; role: Role; title: string; email: string };
type Task = {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  assignedBy: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  isPrivate: boolean;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  progress?: number;
};

// Fonctions de mapping des statuts (synchronisation avec Mode Gestion)
function mapStatusFromAPI(status: string | undefined | null): Task['status'] {
  switch(status) {
    case 'done': return 'completed';
    case 'in_progress': return 'in-progress';
    case 'cancelled': return 'cancelled';
    case 'pending':
    default: return 'pending';
  }
}

function mapStatusToAPI(status: Task['status']): string {
  switch(status) {
    case 'completed': return 'done';
    case 'in-progress': return 'in_progress';
    case 'cancelled': return 'cancelled';
    case 'pending':
    default: return 'pending';
  }
}

export default function TasksPanel({
  currentUser,
  onClose,
  preselectedMember,
}: {
  currentUser: { id: string; name: string; role: Role };
  onClose: () => void;
  preselectedMember?: { id: string; name: string } | null;
}) {
  const [directory, setDirectory] = useState<Member[]>([]);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'list' | 'kanban'>('list');
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [detail, setDetail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [saving, setSaving] = useState(false);

  const assignableUsers = useMemo(() => {
    return getAssignableUsers(currentUser.role, directory);
  }, [currentUser.role, directory]);

  // Si un membre est pré-sélectionné, ouvrir le formulaire automatiquement
  useEffect(() => {
    if (preselectedMember) {
      setAssigneeId(preselectedMember.id);
      setShowAddForm(true);
    }
  }, [preselectedMember]);

  const canAssignTasks = ["chef", "administration", "finance"].includes(currentUser.role);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/team/directory", { cache: "no-store" });
      const data = await res.json();
      const items: Member[] = data?.items || [];
      setDirectory(items);
      
      if (canAssignTasks && assignableUsers.length > 0) {
        setAssigneeId(assignableUsers[0].id);
      } else {
        setAssigneeId(currentUser.id);
      }
    })();
  }, [currentUser.id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Utiliser /api/tasks (même API que Mode Gestion) pour synchroniser les données
        const res = await fetch(`/api/tasks`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const allTasks = Array.isArray(data) ? data : (data.tasks || []);
          // Mapper les données vers le format attendu
          const mapped: Task[] = allTasks.map((t: any) => ({
            id: String(t.id),
            title: t.title || '',
            description: t.description || '',
            assignedTo: t.userId?.toString() || t.assignedTo || currentUser.id,
            assignedBy: t.assignedById || t.metadata?.assignedById || currentUser.id,
            priority: t.priority || t.metadata?.priority || 'medium',
            status: mapStatusFromAPI(t.status),
            isPrivate: t.isPrivate || false,
            dueDate: t.dueAt || t.dueDate,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            progress: t.progress ?? t.metadata?.progress ?? (t.status === 'done' ? 100 : t.status === 'in_progress' ? 50 : 0)
          }));
          // Filtrer par assigné si nécessaire
          const filtered = assigneeId 
            ? mapped.filter(t => t.assignedTo === assigneeId || !assigneeId)
            : mapped;
          setTasks(filtered);
        } else {
          setTasks([]);
        }
      } catch (err) {
        console.error('Error loading tasks:', err);
        setTasks([]);
      } finally { setLoading(false); }
    })();
  }, [assigneeId, currentUser.id]);

  // Stats
  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    completionRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0
  }), [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filterStatus, searchQuery]);

  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in-progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  async function addTask() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const targetUserId = canAssignTasks ? assigneeId : currentUser.id;
      // Utiliser /api/tasks (même API que Mode Gestion)
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: [project.trim(), detail.trim()].filter(Boolean).join(' — '),
          assignToUserId: targetUserId,
          priority: priority === 'medium' ? 'normal' : priority,
          dueAt: dueDate || null
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || "Erreur lors de l'ajout");
        return;
      }
      // Mapper la tâche créée vers notre format
      const created: Task = {
        id: String(data.id),
        title: data.title,
        description: data.description || '',
        assignedTo: targetUserId,
        assignedBy: currentUser.id,
        priority: priority,
        status: 'pending',
        isPrivate: false,
        dueDate: data.dueAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        progress: 0
      };
      setTasks(prev => [created, ...prev]);
      window.dispatchEvent(new CustomEvent('tasks:updated', { detail: { userId: created.assignedTo } }));
      setTitle("");
      setProject("");
      setDetail("");
      setDueDate("");
      setPriority('medium');
      setShowAddForm(false);
    } catch {
      alert("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  async function updateTaskStatus(taskId: string, newStatus: string) {
    const progress = newStatus === 'completed' ? 100 : newStatus === 'in-progress' ? 50 : 0;
    // Mise à jour optimiste locale
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'], progress } : t));
    try {
      // Utiliser /api/tasks avec PATCH (même API que Mode Gestion)
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: taskId, 
          status: mapStatusToAPI(newStatus as Task['status']),
          progress 
        })
      });
      // Notifier les autres composants
      window.dispatchEvent(new CustomEvent('tasks:updated', { detail: { taskId } }));
    } catch (err) {
      console.error('Error updating task:', err);
    }
  }

  const getPriorityStyle = (p: string) => {
    switch(p) {
      case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300';
      case 'medium': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400';
    }
  };

  const getPriorityLabel = (p: string) => {
    switch(p) { case 'urgent': return '🔴 Urgent'; case 'high': return '🟠 Haute'; case 'medium': return '🔵 Normale'; default: return '🟢 Basse'; }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'from-green-400 to-emerald-500';
    if (progress >= 50) return 'from-blue-400 to-indigo-500';
    if (progress > 0) return 'from-amber-400 to-orange-500';
    return 'from-gray-300 to-gray-400';
  };

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';

  const TaskCard = ({ task }: { task: Task }) => (
    <div className={`group relative bg-white dark:bg-slate-800 rounded-xl p-4 border shadow-sm hover:shadow-lg transition-all ${
      task.priority === 'urgent' ? 'border-red-200 dark:border-red-800' : 
      task.priority === 'high' ? 'border-orange-200 dark:border-orange-800' : 
      'border-gray-100 dark:border-slate-700'
    }`}>
      {/* Progress bar top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-100 dark:bg-slate-700 rounded-t-xl overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${getProgressColor(task.progress || 0)} transition-all`} style={{ width: `${task.progress || 0}%` }} />
      </div>

      <div className="flex items-start justify-between mb-2 pt-1">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityStyle(task.priority)}`}>
          {getPriorityLabel(task.priority)}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => updateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
            className={`p-1.5 rounded-lg transition-colors ${task.status === 'completed' ? 'text-green-500 bg-green-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      <h4 className={`font-semibold text-gray-900 dark:text-white mb-1 ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>
        {task.title}
      </h4>
      {task.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Progression</span>
          <span className={`text-xs font-bold ${task.progress === 100 ? 'text-green-500' : 'text-gray-600 dark:text-gray-300'}`}>
            {task.progress || 0}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${getProgressColor(task.progress || 0)} transition-all`} style={{ width: `${task.progress || 0}%` }} />
        </div>
      </div>

      {/* Status buttons */}
      <div className="flex gap-1">
        {['pending', 'in-progress', 'completed'].map(status => (
          <button
            key={status}
            onClick={() => updateTaskStatus(task.id, status)}
            className={`flex-1 text-xs py-1.5 rounded-lg transition-all ${
              task.status === status 
                ? status === 'completed' ? 'bg-green-500 text-white' : status === 'in-progress' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            {status === 'pending' ? 'À faire' : status === 'in-progress' ? 'En cours' : 'Fait'}
          </button>
        ))}
      </div>

      {task.dueDate && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Calendar className="w-3 h-3" />
          {new Date(task.dueDate).toLocaleDateString('fr-FR')}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-y-0 right-0 w-[580px] bg-gray-50 dark:bg-slate-900 shadow-2xl z-50 flex flex-col">
      {/* Header Premium */}
      <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-5">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Gestion des Tâches</h2>
              <p className="text-purple-200 text-sm">{stats.total} tâches · {stats.completionRate}% complété</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="relative grid grid-cols-4 gap-2 mt-4">
          {[
            { label: 'Total', value: stats.total, icon: FolderKanban, color: 'bg-white/10' },
            { label: 'À faire', value: stats.pending, icon: Clock, color: 'bg-amber-500/20' },
            { label: 'En cours', value: stats.inProgress, icon: Activity, color: 'bg-blue-500/20' },
            { label: 'Terminé', value: stats.completed, icon: CheckCircle, color: 'bg-green-500/20' },
          ].map((stat, i) => (
            <div key={i} className={`${stat.color} backdrop-blur-xl rounded-xl p-3 text-center`}>
              <stat.icon className="w-4 h-4 text-white/70 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-[10px] text-purple-200">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          {/* Assignee selector */}
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            disabled={!canAssignTasks}
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-700 rounded-xl text-sm outline-none border-0 focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
          >
            {(canAssignTasks ? assignableUsers : directory.filter((m) => m.id === currentUser.id)).map((m) => (
              <option key={m.id} value={m.id}>👤 {m.name} · {getRoleDisplayName(m.role)}</option>
            ))}
            {!directory.find((m) => m.id === currentUser.id) && (
              <option value={currentUser.id}>👤 {currentUser.name}</option>
            )}
          </select>
          
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouvelle
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-slate-700 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
          
          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-slate-700 rounded-xl text-sm outline-none"
          >
            <option value="all">📊 Tous</option>
            <option value="pending">⏳ À faire</option>
            <option value="in-progress">🔄 En cours</option>
            <option value="completed">✅ Terminé</option>
          </select>

          {/* View toggle */}
          <div className="flex bg-gray-100 dark:bg-slate-700 rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-lg text-xs ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm text-purple-600' : 'text-gray-500'}`}
            >
              Liste
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 rounded-lg text-xs ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-600 shadow-sm text-purple-600' : 'text-gray-500'}`}
            >
              Kanban
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="grid grid-cols-3 gap-3 h-full">
            {/* Pending */}
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl overflow-hidden">
              <div className="p-3 bg-slate-200 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">À faire</span>
                  <span className="ml-auto text-xs bg-slate-300 dark:bg-slate-700 px-2 py-0.5 rounded-full">{pendingTasks.length}</span>
                </div>
              </div>
              <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                {pendingTasks.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">Aucune tâche</p>
                ) : pendingTasks.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl overflow-hidden">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-blue-700 dark:text-blue-300 text-sm">En cours</span>
                  <span className="ml-auto text-xs bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">{inProgressTasks.length}</span>
                </div>
              </div>
              <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                {inProgressTasks.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">Aucune tâche</p>
                ) : inProgressTasks.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>

            {/* Completed */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl overflow-hidden">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 border-b border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-green-700 dark:text-green-300 text-sm">Terminé</span>
                  <span className="ml-auto text-xs bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">{completedTasks.length}</span>
                </div>
              </div>
              <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                {completedTasks.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">Aucune tâche</p>
                ) : completedTasks.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <CheckSquare className="w-16 h-16 mb-4 opacity-30" />
                <p className="font-medium">Aucune tâche</p>
                <p className="text-sm">Cliquez sur "Nouvelle" pour créer une tâche</p>
              </div>
            ) : filteredTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Nouvelle tâche</h3>
                  <p className="text-purple-200 text-sm">Assigner à {directory.find(m => m.id === assigneeId)?.name || 'vous-même'}</p>
                </div>
              </div>
              <button onClick={() => setShowAddForm(false)} className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Préparer le rapport mensuel"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Projet / Contexte</label>
                <input
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="Ex: Client X, Interne..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Détails, objectifs, livrables..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priorité</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="low">🟢 Basse</option>
                    <option value="medium">🔵 Normale</option>
                    <option value="high">🟠 Haute</option>
                    <option value="urgent">🔴 Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Échéance</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Quick date buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    setDueDate(d.toISOString().split('T')[0]);
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600"
                >
                  Aujourd'hui
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setDueDate(d.toISOString().split('T')[0]);
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600"
                >
                  Demain
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    setDueDate(d.toISOString().split('T')[0]);
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600"
                >
                  +7 jours
                </button>
              </div>
            </div>

            <div className="p-5 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-3 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 font-medium border border-gray-200 dark:border-slate-600"
              >
                Annuler
              </button>
              <button
                onClick={addTask}
                disabled={saving || !title.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 font-medium shadow-lg shadow-purple-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Créer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}