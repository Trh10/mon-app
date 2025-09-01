export default function EmailConnectionDemo() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div className="bg-white rounded-lg border p-6">
        <h1 className="text-3xl font-bold mb-4">🎉 Système Multi-Comptes Email</h1>
        <p className="text-gray-600 text-lg">
          Votre nouveau système de connexion multi-comptes est maintenant opérationnel !
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-blue-800 mb-4">✨ Comment ça fonctionne</h2>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
            <div>
              <h3 className="font-semibold">Cliquez sur "Ajouter un compte"</h3>
              <p className="text-sm text-gray-600">Choisissez parmi Gmail, Outlook, Yahoo, IMAP, Exchange ou Autre</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
            <div>
              <h3 className="font-semibold">Entrez vos identifiants</h3>
              <p className="text-sm text-gray-600">Email et mot de passe (serveurs pré-configurés automatiquement)</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
            <div>
              <h3 className="font-semibold">Vos emails apparaissent</h3>
              <p className="text-sm text-gray-600">L'interface mail affiche les messages du compte connecté</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
            <div>
              <h3 className="font-semibold">Statut dynamique</h3>
              <p className="text-sm text-gray-600">Le bouton affiche "Connecté à Gmail/Outlook/etc." selon votre choix</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            📧 Providers supportés
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white">📧</div>
              <span>Gmail (google.com)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">📮</div>
              <span>Outlook/Hotmail (microsoft.com)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white">💜</div>
              <span>Yahoo Mail</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white">⚙️</div>
              <span>IMAP/SMTP (custom)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white">🏢</div>
              <span>Exchange Server</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">📬</div>
              <span>Autres providers</span>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            🎯 Fonctionnalités
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✅</span>
              <span>Connexion multi-comptes simultanés</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✅</span>
              <span>Changement rapide entre comptes</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✅</span>
              <span>Affichage du statut de connexion</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✅</span>
              <span>Compteur d'emails non lus</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✅</span>
              <span>Déconnexion individuelle</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✅</span>
              <span>Auto-configuration serveurs</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-green-600">✅</span>
              <span>Interface responsive</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-green-800 mb-4">🚀 Liens rapides</h3>
        <div className="flex flex-wrap gap-3">
          <a 
            href="/email-accounts" 
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            target="_blank"
          >
            Gérer les comptes email
          </a>
          <a 
            href="/" 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Interface mail principale
          </a>
          <a 
            href="/admin" 
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Administration
          </a>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-yellow-800 mb-4">💡 Ce qui change pour vous</h3>
        <div className="space-y-2 text-sm">
          <p><strong>Avant :</strong> Bouton "Déconnecté" ou "Gmail" fixe</p>
          <p><strong>Maintenant :</strong> Sélecteur dynamique qui affiche :</p>
          <ul className="list-disc ml-6 space-y-1">
            <li>"Connecté à Gmail" si vous connectez Gmail</li>
            <li>"Connecté à Outlook" si vous connectez Outlook</li>
            <li>"Connecté à Yahoo" si vous connectez Yahoo</li>
            <li>"Connecté IMAP" pour les comptes IMAP custom</li>
            <li>"Déconnecté" si aucun compte actif</li>
          </ul>
          <p className="mt-3 font-medium text-yellow-800">
            Plus besoin de coder - tout est automatique ! 🎉
          </p>
        </div>
      </div>
    </div>
  );
}
