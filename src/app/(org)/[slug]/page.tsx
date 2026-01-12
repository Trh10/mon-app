"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Message = {
  id: string;
  content: string;
  kind: string;
  createdAt: string;
  userId?: number;
};

type Task = {
  id: string;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
  dueAt?: string;
};

export default function OrgDashboard() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newTask, setNewTask] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [messagesRes, tasksRes] = await Promise.all([
        fetch("/api/messages?limit=20"),
        fetch("/api/tasks")
      ]);
      
      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData);
      }
      
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage,
          kind: "user"
        }),
      });
      
      if (res.ok) {
        setNewMessage("");
        loadData(); // Recharger les messages
      }
    } catch (error) {
      console.error("Erreur envoi message:", error);
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim()) return;
    
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      
      if (res.ok) {
        setNewTask({ title: "", description: "" });
        loadData(); // Recharger les tâches
      }
    } catch (error) {
      console.error("Erreur création tâche:", error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status }),
      });
      
      if (res.ok) {
        loadData(); // Recharger les tâches
      }
    } catch (error) {
      console.error("Erreur mise à jour tâche:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          Dashboard - {slug}
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section Messages */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Messages</h2>
            
            {/* Formulaire nouveau message */}
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Écrivez un message..."
                className="flex-1 px-3 py-2 border rounded-md"
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Envoyer
              </button>
            </div>
            
            {/* Liste des messages */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id} className="p-3 bg-gray-50 rounded">
                  <div className="text-sm text-gray-600 mb-1">
                    {new Date(message.createdAt).toLocaleString()}
                  </div>
                  <div>{message.content}</div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-gray-500 italic">Aucun message</div>
              )}
            </div>
          </div>

          {/* Section Tâches */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Tâches</h2>
            
            {/* Formulaire nouvelle tâche */}
            <div className="mb-4 space-y-2">
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Titre de la tâche..."
                className="w-full px-3 py-2 border rounded-md bg-white text-gray-900 placeholder-gray-400"
              />
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Description (optionnelle)..."
                className="w-full px-3 py-2 border rounded-md h-20 bg-white text-gray-900 placeholder-gray-400"
              />
              <button
                onClick={createTask}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Créer tâche
              </button>
            </div>
            
            {/* Liste des tâches */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tasks.map((task) => (
                <div key={task.id} className="p-3 border rounded">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{task.title}</h3>
                    <select
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="pending">En attente</option>
                      <option value="in_progress">En cours</option>
                      <option value="done">Terminé</option>
                      <option value="cancelled">Annulé</option>
                    </select>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                  )}
                  <div className="text-xs text-gray-500">
                    Créé: {new Date(task.createdAt).toLocaleDateString()}
                    {task.dueAt && (
                      <span className="ml-3">
                        Échéance: {new Date(task.dueAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="text-gray-500 italic">Aucune tâche</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}