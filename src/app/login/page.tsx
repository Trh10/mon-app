"use client";

import { useState } from 'react';
import { Building2, User, Key, ArrowRight, Crown, Users } from 'lucide-react';

interface CompanyCheckResult {
  exists: boolean;
  companyId?: string;
  companyName: string;
  screenType: 'employee-login' | 'founder-setup';
  requiredCode: string;
  message: string;
}

export default function LoginPage() {
  const [step, setStep] = useState<'company-check' | 'login-form'>('company-check');
  const [companyName, setCompanyName] = useState('');
  const [checkResult, setCheckResult] = useState<CompanyCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Formulaire final
  const [userInfo, setUserInfo] = useState({
    name: '',
    code: ''
  });

  // Étape 1 : Vérifier l'entreprise
  const handleCompanyCheck = async () => {
    if (!companyName.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/auth/check-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: companyName.trim() })
      });

      const result = await response.json();
      
      if (response.ok) {
        setCheckResult(result);
        setUserInfo({ ...userInfo, code: result.requiredCode });
        setStep('login-form');
      } else {
        alert(result.error || 'Erreur lors de la vérification');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  // Étape 2 : Connexion ou création
  const handleLogin = async () => {
    if (!userInfo.name.trim() || !userInfo.code) return;

    setLoading(true);
    try {
      if (checkResult?.screenType === 'founder-setup') {
        // Créer l'entreprise
        const response = await fetch('/api/auth/check-company', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: checkResult.companyName,
            founderName: userInfo.name,
            code: userInfo.code
          })
        });

        const result = await response.json();
        
        if (response.ok) {
          alert(`🎉 ${result.message}`);
          // Rediriger vers l'application avec les données utilisateur
          console.log('Utilisateur DG créé:', result.user);
          // TODO: Rediriger vers dashboard avec session
          window.location.href = '/';
        } else {
          alert(result.error || 'Erreur lors de la création');
        }
      } else {
        // Connexion employé (à implémenter)
        alert('Connexion employé en cours de développement...');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="bg-blue-600 text-white p-3 rounded-xl inline-block mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ICONES BOX</h1>
          <p className="text-gray-600 mt-2">Plateforme collaborative intelligente</p>
        </div>

        {/* Étape 1 : Vérification entreprise */}
        {step === 'company-check' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏢 Nom de votre entreprise
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: All In One"
                onKeyPress={(e) => e.key === 'Enter' && handleCompanyCheck()}
              />
            </div>

            <button
              onClick={handleCompanyCheck}
              disabled={!companyName.trim() || loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Étape 2 : Formulaire de connexion */}
        {step === 'login-form' && checkResult && (
          <div className="space-y-6">
            
            {/* Message d'information */}
            <div className={`p-4 rounded-lg ${
              checkResult.screenType === 'founder-setup' 
                ? 'bg-amber-50 border border-amber-200' 
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center gap-3">
                {checkResult.screenType === 'founder-setup' ? (
                  <Crown className="w-5 h-5 text-amber-600" />
                ) : (
                  <Users className="w-5 h-5 text-blue-600" />
                )}
                <div>
                  <p className={`font-medium ${
                    checkResult.screenType === 'founder-setup' ? 'text-amber-800' : 'text-blue-800'
                  }`}>
                    {checkResult.message}
                  </p>
                  {checkResult.screenType === 'founder-setup' && (
                    <p className="text-amber-600 text-sm mt-1">
                      Vous deviendrez le Directeur Général
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Entreprise sélectionnée */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏢 Entreprise
              </label>
              <div className="px-4 py-3 bg-gray-50 border rounded-lg text-gray-600">
                {checkResult.companyName}
              </div>
            </div>

            {/* Nom utilisateur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                {checkResult.screenType === 'founder-setup' ? 'Votre nom complet' : 'Votre prénom'}
              </label>
              <input
                type="text"
                value={userInfo.name}
                onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={checkResult.screenType === 'founder-setup' ? 'Jean Dupont' : 'Marie'}
              />
            </div>

            {/* Code d'accès */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Key className="w-4 h-4 inline mr-1" />
                Code d'accès ({checkResult.requiredCode})
              </label>
              <input
                type="password"
                value={userInfo.code}
                onChange={(e) => setUserInfo({...userInfo, code: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="****"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('company-check')}
                className="flex-1 py-3 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Retour
              </button>
              <button
                onClick={handleLogin}
                disabled={!userInfo.name.trim() || !userInfo.code || loading}
                className={`flex-2 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  checkResult.screenType === 'founder-setup' 
                    ? 'bg-amber-600 hover:bg-amber-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                ) : (
                  checkResult.screenType === 'founder-setup' ? 'Créer l\'entreprise' : 'Se connecter'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
