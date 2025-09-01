"use client";

import { useState, useEffect } from "react";
import { getRealtimeClient } from "../../lib/realtime/provider";
import { getNotificationManager } from "../../lib/notifications/manager";

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string;
  assignedToName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
  dueDate?: number;
  tags?: string[];
  estimatedHours?: number;
  actualHours?: number;
  comments?: TaskComment[];
}

interface TaskComment {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  timestamp: number;
}

interface RealtimeTaskManagerProps {
  roomId: string;
  userId: string;
  userName: string;
  userRole: "chef" | "manager" | "assistant" | "employe";
  compact?: boolean;
}

const STATUS_CONFIG = {
  todo: { label: "À faire", color: "bg-gray-100 text-gray-800", emoji: "📋" },
  in_progress: { label: "En cours", color: "bg-blue-100 text-blue-800", emoji: "⚡" },
  review: { label: "À réviser", color: "bg-yellow-100 text-yellow-800", emoji: "👀" },
  done: { label: "Terminé", color: "bg-green-100 text-green-800", emoji: "✅" }
};

const PRIORITY_CONFIG = {
  low: { label: "Basse", color: "bg-gray-100 text-gray-600", emoji: "⬇️" },
  medium: { label: "Moyenne", color: "bg-blue-100 text-blue-600", emoji: "➡️" },
  high: { label: "Haute", color: "bg-orange-100 text-orange-600", emoji: "⬆️" },
  urgent: { label: "Urgente", color: "bg-red-100 text-red-600", emoji: "🚨" }
};

export default function RealtimeTaskManager({
  roomId,
  userId,
  userName,
  userRole,
  compact = false
}: RealtimeTaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<"all" | "my" | "assigned">("all");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    assignedTo: "",
    dueDate: "",
    estimatedHours: 0
  });

  const rt = getRealtimeClient();

  // Créer une nouvelle tâche
  const createTask = async () => {
    if (!newTask.title.trim()) return;

    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newTask.title,
      description: newTask.description,
      status: "todo",
      priority: newTask.priority,
      assignedTo: newTask.assignedTo || undefined,
      assignedToName: newTask.assignedTo ? "Utilisateur" : undefined, // TODO: récupérer le vrai nom
      createdBy: userId,
      createdByName: userName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dueDate: newTask.dueDate ? new Date(newTask.dueDate).getTime() : undefined,
      estimatedHours: newTask.estimatedHours || undefined,
      comments: []
    };

    setTasks(prev => [...prev, task]);
    setShowNewTaskForm(false);
    setNewTask({
      title: "",
      description: "",
      priority: "medium",
      assignedTo: "",
      dueDate: "",
      estimatedHours: 0
    });

    // Synchroniser en temps réel
    await rt.trigger(roomId, "task_created", {
      task,
      createdBy: { id: userId, name: userName }
    });

    // Notification
    const notificationManager = getNotificationManager();
    notificationManager.addNotification({
      type: 'task',
      title: 'Tâche créée',
      message: `"${task.title}" a été créée`,
      priority: 'normal'
    });

    // Notifier l'assigné si différent du créateur
    if (task.assignedTo && task.assignedTo !== userId) {
      notificationManager.addNotification({
        type: 'task',
        title: 'Nouvelle tâche assignée',
        message: `"${task.title}" vous a été assignée par ${userName}`,
        priority: 'high'
      });
    }
  };

  // Mettre à jour le statut d'une tâche
  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, status: newStatus, updatedAt: Date.now() }
        : task
    ));

    // Synchroniser en temps réel
    await rt.trigger(roomId, "task_status_updated", {
      taskId,
      newStatus,
      updatedBy: { id: userId, name: userName },
      timestamp: Date.now()
    });

    // Notification si tâche terminée
    if (newStatus === "done") {
      const task = tasks.find(t => t.id === taskId);
      const notificationManager = getNotificationManager();
      notificationManager.addNotification({
        type: 'task',
        title: 'Tâche terminée',
        message: `"${task?.title}" a été marquée comme terminée`,
        priority: 'normal'
      });
    }
  };

  // Ajouter un commentaire
  const addComment = async (taskId: string, commentText: string) => {
    if (!commentText.trim()) return;

    const comment: TaskComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: commentText,
      authorId: userId,
      authorName: userName,
      timestamp: Date.now()
    };

    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { 
            ...task, 
            comments: [...(task.comments || []), comment],
            updatedAt: Date.now()
          }
        : task
    ));

    // Synchroniser en temps réel
    await rt.trigger(roomId, "task_comment_added", {
      taskId,
      comment,
      addedBy: { id: userId, name: userName }
    });
  };

  // Filtrer les tâches
  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    
    if (filter === "my") return task.createdBy === userId;
    if (filter === "assigned") return task.assignedTo === userId;
    
    return true;
  }).sort((a, b) => {
    // Trier par priorité puis par date de création
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];
    
    if (aPriority !== bPriority) return bPriority - aPriority;
    return b.createdAt - a.createdAt;
  });

  // Statistiques
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === "todo").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    done: tasks.filter(t => t.status === "done").length,
    myTasks: tasks.filter(t => t.assignedTo === userId).length
  };

  // Écouter les événements en temps réel
  useEffect(() => {
    const unsubscribeTaskCreated = rt.subscribe(roomId, "task_created", (data: any) => {
      if (data.createdBy.id !== userId) {
        setTasks(prev => [...prev, data.task]);
      }
    });

    const unsubscribeTaskUpdated = rt.subscribe(roomId, "task_status_updated", (data: any) => {
      if (data.updatedBy.id !== userId) {
        setTasks(prev => prev.map(task => 
          task.id === data.taskId 
            ? { ...task, status: data.newStatus, updatedAt: data.timestamp }
            : task
        ));
      }
    });

    const unsubscribeCommentAdded = rt.subscribe(roomId, "task_comment_added", (data: any) => {
      if (data.addedBy.id !== userId) {
        setTasks(prev => prev.map(task => 
          task.id === data.taskId 
            ? { 
                ...task, 
                comments: [...(task.comments || []), data.comment],
                updatedAt: Date.now()
              }
            : task
        ));
      }
    });

    return () => {
      unsubscribeTaskCreated();
      unsubscribeTaskUpdated();
      unsubscribeCommentAdded();
    };
  }, [roomId, userId, rt]);

  if (compact) {
    return (
      <div className="task-manager-compact bg-white border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Tâches</h3>
          <button
            onClick={() => setShowNewTaskForm(true)}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
          >
            + Nouveau
          </button>
        </div>
        
        <div className="text-xs text-gray-600 grid grid-cols-4 gap-1 mb-2">
          <div>📋 {stats.todo}</div>
          <div>⚡ {stats.inProgress}</div>
          <div>✅ {stats.done}</div>
          <div>👤 {stats.myTasks}</div>
        </div>

        <div className="max-h-40 overflow-y-auto space-y-1">
          {filteredTasks.slice(0, 5).map(task => (
            <div
              key={task.id}
              className="p-2 border rounded text-xs cursor-pointer hover:bg-gray-50"
              onClick={() => setSelectedTask(task)}
            >
              <div className="flex items-center gap-1">
                <span>{PRIORITY_CONFIG[task.priority].emoji}</span>
                <span className="flex-1 truncate">{task.title}</span>
                <span className={`px-1 rounded ${STATUS_CONFIG[task.status].color}`}>
                  {STATUS_CONFIG[task.status].emoji}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="realtime-task-manager bg-white border rounded-lg">
      {/* En-tête */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Gestion des Tâches</h2>
          <button
            onClick={() => setShowNewTaskForm(true)}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={userRole === "employe"}
          >
            + Nouvelle Tâche
          </button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-4 gap-4 mb-3">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-bold">{stats.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <div className="text-lg font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-xs text-gray-600">En cours</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="text-lg font-bold text-green-600">{stats.done}</div>
            <div className="text-xs text-gray-600">Terminées</div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded">
            <div className="text-lg font-bold text-purple-600">{stats.myTasks}</div>
            <div className="text-xs text-gray-600">Mes tâches</div>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="all">Toutes les tâches</option>
            <option value="my">Mes tâches créées</option>
            <option value="assigned">Assignées à moi</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="todo">À faire</option>
            <option value="in_progress">En cours</option>
            <option value="review">À réviser</option>
            <option value="done">Terminé</option>
          </select>
        </div>
      </div>

      {/* Liste des tâches */}
      <div className="max-h-96 overflow-y-auto">
        {filteredTasks.map(task => (
          <div
            key={task.id}
            className="p-4 border-b hover:bg-gray-50 cursor-pointer"
            onClick={() => setSelectedTask(task)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-1 rounded text-xs ${PRIORITY_CONFIG[task.priority].color}`}>
                    {PRIORITY_CONFIG[task.priority].emoji} {PRIORITY_CONFIG[task.priority].label}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${STATUS_CONFIG[task.status].color}`}>
                    {STATUS_CONFIG[task.status].emoji} {STATUS_CONFIG[task.status].label}
                  </span>
                </div>
                
                <h3 className="font-medium">{task.title}</h3>
                {task.description && (
                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                )}
                
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>Par {task.createdByName}</span>
                  {task.assignedToName && <span>Assigné à {task.assignedToName}</span>}
                  {task.dueDate && (
                    <span className={task.dueDate < Date.now() ? "text-red-500" : ""}>
                      Échéance: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {task.comments && task.comments.length > 0 && (
                    <span>💬 {task.comments.length}</span>
                  )}
                </div>
              </div>
              
              {/* Actions rapides */}
              <div className="flex gap-1 ml-4">
                {task.status !== "done" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextStatus = task.status === "todo" ? "in_progress" : 
                                       task.status === "in_progress" ? "review" : "done";
                      updateTaskStatus(task.id, nextStatus);
                    }}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  >
                    ➡️
                  </button>
                )}
                {task.status === "done" && (
                  <span className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs">
                    ✅ Terminé
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {filteredTasks.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <div>Aucune tâche trouvée</div>
            <div className="text-sm">Créez votre première tâche pour commencer</div>
          </div>
        )}
      </div>

      {/* Modal nouvelle tâche */}
      {showNewTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Nouvelle Tâche</h3>
            
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Titre de la tâche"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
              />
              
              <textarea
                placeholder="Description (optionnelle)"
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded h-20"
              />
              
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="low">Priorité Basse</option>
                <option value="medium">Priorité Moyenne</option>
                <option value="high">Priorité Haute</option>
                <option value="urgent">Priorité Urgente</option>
              </select>
              
              <input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={createTask}
                className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
              >
                Créer
              </button>
              <button
                onClick={() => setShowNewTaskForm(false)}
                className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détails tâche */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold">{selectedTask.title}</h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {/* Détails de la tâche */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded text-sm ${PRIORITY_CONFIG[selectedTask.priority].color}`}>
                  {PRIORITY_CONFIG[selectedTask.priority].emoji} {PRIORITY_CONFIG[selectedTask.priority].label}
                </span>
                <span className={`px-2 py-1 rounded text-sm ${STATUS_CONFIG[selectedTask.status].color}`}>
                  {STATUS_CONFIG[selectedTask.status].emoji} {STATUS_CONFIG[selectedTask.status].label}
                </span>
              </div>
              
              {selectedTask.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-gray-700">{selectedTask.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Créé par:</strong> {selectedTask.createdByName}
                </div>
                <div>
                  <strong>Créé le:</strong> {new Date(selectedTask.createdAt).toLocaleString()}
                </div>
                {selectedTask.assignedToName && (
                  <div>
                    <strong>Assigné à:</strong> {selectedTask.assignedToName}
                  </div>
                )}
                {selectedTask.dueDate && (
                  <div>
                    <strong>Échéance:</strong> {new Date(selectedTask.dueDate).toLocaleString()}
                  </div>
                )}
              </div>
              
              {/* Commentaires */}
              {selectedTask.comments && selectedTask.comments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Commentaires ({selectedTask.comments.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedTask.comments.map(comment => (
                      <div key={comment.id} className="p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600 mb-1">
                          {comment.authorName} • {new Date(comment.timestamp).toLocaleString()}
                        </div>
                        <div>{comment.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Ajouter commentaire */}
              <div>
                <textarea
                  placeholder="Ajouter un commentaire..."
                  className="w-full px-3 py-2 border rounded"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      const text = (e.target as HTMLTextAreaElement).value;
                      if (text.trim()) {
                        addComment(selectedTask.id, text);
                        (e.target as HTMLTextAreaElement).value = "";
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
