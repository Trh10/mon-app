'use client';

import { useState, useEffect } from 'react';
import { Loader2, Mail, Settings, TestTube, Clock, CheckCircle, XCircle } from 'lucide-react';

interface NotificationSettings {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  maxRetries: number;
  retryDelay: number;
}

interface QueueStatus {
  pending: number;
  total: number;
  notifications: any[];
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    smtpHost: 'localhost',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: 'noreply@company.com',
    fromName: 'Système de Réquisitions',
    maxRetries: 3,
    retryDelay: 5
  });

  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    pending: 0,
    total: 0,
    notifications: []
  });

  const [activeTab, setActiveTab] = useState('settings');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');

  // Charger les paramètres au montage
  useEffect(() => {
    loadSettings();
    loadQueueStatus();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications');
      const data = await response.json();
      
      if (response.ok) {
        setSettings(data);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur chargement paramètres' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur réseau' });
    } finally {
      setLoading(false);
    }
  };

  const loadQueueStatus = async () => {
    try {
      const response = await fetch('/api/notifications?action=queue-status');
      const data = await response.json();
      
      if (response.ok) {
        setQueueStatus(data);
      }
    } catch (error) {
      console.error('Erreur chargement queue:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Paramètres sauvegardés avec succès' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur sauvegarde' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur réseau' });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      setMessage(null);
      
      const response = await fetch('/api/notifications?action=test-connection');
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Connexion SMTP testée avec succès' });
      } else {
        setMessage({ type: 'error', text: 'Échec du test de connexion SMTP' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur test connexion' });
    } finally {
      setTesting(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Veuillez saisir un email de test' });
      return;
    }

    try {
      setTesting(true);
      setMessage(null);
      
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test-email',
          recipientEmail: testEmail,
          recipientName: 'Test User'
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: `Email de test envoyé à ${testEmail}` });
      } else {
        setMessage({ type: 'error', text: 'Échec envoi email de test' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur envoi email de test' });
    } finally {
      setTesting(false);
    }
  };

  const processQueue = async () => {
    try {
      setProcessing(true);
      setMessage(null);
      
      const response = await fetch('/api/notifications?action=process-queue');
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Queue traitée: ${data.sent} envoyés, ${data.failed} échoués` 
        });
        loadQueueStatus();
      } else {
        setMessage({ type: 'error', text: 'Erreur traitement queue' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur réseau' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Chargement des paramètres...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configuration des Notifications</h2>
          <p className="text-gray-600">
            Gérer les paramètres d'envoi d'emails automatiques
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded text-sm ${
            settings.enabled 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {settings.enabled ? "Activé" : "Désactivé"}
          </span>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded border ${
          message.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'settings', label: 'Paramètres SMTP', icon: Settings },
            { id: 'queue', label: 'Queue des Emails', icon: Mail },
            { id: 'test', label: 'Tests', icon: TestTube }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-lg border p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Configuration SMTP</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={settings.enabled}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, enabled: e.target.checked }))
                  }
                  className="h-4 w-4"
                />
                <label htmlFor="enabled" className="font-medium">
                  Activer les notifications email
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Serveur SMTP</label>
                  <input
                    type="text"
                    value={settings.smtpHost}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, smtpHost: e.target.value }))
                    }
                    placeholder="smtp.gmail.com"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Port</label>
                  <input
                    type="number"
                    value={settings.smtpPort}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) || 587 }))
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="secure"
                  checked={settings.smtpSecure}
                  onChange={(e) => 
                    setSettings(prev => ({ ...prev, smtpSecure: e.target.checked }))
                  }
                  className="h-4 w-4"
                />
                <label htmlFor="secure">Connexion sécurisée (SSL/TLS)</label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom d'utilisateur</label>
                  <input
                    type="text"
                    value={settings.smtpUser}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, smtpUser: e.target.value }))
                    }
                    placeholder="user@domain.com"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mot de passe</label>
                  <input
                    type="password"
                    value={settings.smtpPassword}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, smtpPassword: e.target.value }))
                    }
                    placeholder="Mot de passe SMTP"
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email expéditeur</label>
                  <input
                    type="email"
                    value={settings.fromEmail}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, fromEmail: e.target.value }))
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nom expéditeur</label>
                  <input
                    type="text"
                    value={settings.fromName}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, fromName: e.target.value }))
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tentatives maximum</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxRetries}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 3 }))
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Délai entre tentatives (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.retryDelay}
                    onChange={(e) => 
                      setSettings(prev => ({ ...prev, retryDelay: parseInt(e.target.value) || 5 }))
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button 
                  onClick={testConnection} 
                  disabled={testing || !settings.enabled}
                  className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 flex items-center space-x-2"
                >
                  {testing && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Tester la connexion</span>
                </button>
                <button 
                  onClick={saveSettings} 
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Sauvegarder</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-lg border p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Queue des Emails</h3>
            <button 
              onClick={loadQueueStatus}
              className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
            >
              Actualiser
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-orange-600">{queueStatus.pending}</div>
              <div className="text-sm text-gray-600">En attente</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{queueStatus.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div>
              <button 
                onClick={processQueue} 
                disabled={processing || queueStatus.pending === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 mx-auto"
              >
                {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Traiter la queue</span>
              </button>
            </div>
          </div>

          {queueStatus.notifications.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Dernières notifications en attente</h4>
              <div className="space-y-2">
                {queueStatus.notifications.map((notif, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{notif.subject}</div>
                      <div className="text-sm text-gray-600">
                        {notif.recipientEmail} • {notif.type}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        notif.priority === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {notif.priority}
                      </span>
                      <span className="px-2 py-1 border rounded text-xs">
                        {notif.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test Tab */}
      {activeTab === 'test' && (
        <div className="bg-white rounded-lg border p-6 space-y-6">
          <h3 className="text-lg font-medium">Tests et Diagnostics</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email de test</label>
              <div className="flex space-x-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 p-2 border rounded"
                />
                <button 
                  onClick={sendTestEmail} 
                  disabled={testing || !settings.enabled}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {testing && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Envoyer</span>
                </button>
              </div>
            </div>

            <div className="border rounded p-4 space-y-3">
              <h4 className="font-medium">État du système</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  {settings.enabled ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span>Notifications: {settings.enabled ? 'Activées' : 'Désactivées'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>Queue: {queueStatus.pending} en attente</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
