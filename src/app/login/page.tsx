"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SimpleEmailLogin } from "@/components/SimpleEmailLogin";
import { UniversalEmailLogin } from "@/components/UniversalEmailLogin";
import { Mail, Users, Settings, Lock } from "lucide-react";

export default function LoginPage() {
  const [loginMode, setLoginMode] = useState<"simple" | "advanced">("simple");
  const [userRole, setUserRole] = useState<"chef" | "manager" | "assistant" | "employe">("employe");
  const [organizationId, setOrganizationId] = useState("company-1");
  const router = useRouter();

  const handleConnect = (credentials: any) => {
    // Store credentials and user info
    localStorage.setItem('email_credentials', btoa(JSON.stringify(credentials)));
    localStorage.setItem('user_role', userRole);
    localStorage.setItem('organization_id', organizationId);
    localStorage.setItem('user_name', credentials.email?.split('@')[0] || 'User');
    
    // Navigate to main app
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 via-blue-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Mon App - Connexion
            </h1>
            <p className="text-gray-600">
              Votre assistant email intelligent avec gestion d'équipe
            </p>
          </div>

          {/* Role Selection */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-gray-800">Votre rôle dans l'entreprise</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "chef", label: "Directeur Général", desc: "Accès complet, assignation de tâches" },
                { id: "manager", label: "Manager", desc: "Gestion d'équipe, validation" },
                { id: "assistant", label: "Assistant", desc: "Support, communication" },
                { id: "employe", label: "Employé", desc: "Accès standard, demandes de besoins" }
              ].map((role) => (
                <button
                  key={role.id}
                  onClick={() => setUserRole(role.id as any)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    userRole === role.id 
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <div className="font-medium text-sm">{role.label}</div>
                  <div className="text-xs opacity-70">{role.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Organization ID */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-gray-800">Organisation</h3>
            </div>
            <input
              type="text"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              placeholder="ID de votre organisation"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Login Mode Toggle */}
          <div className="mb-6">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setLoginMode("simple")}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  loginMode === "simple"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Connexion Simple
              </button>
              <button
                onClick={() => setLoginMode("advanced")}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  loginMode === "advanced"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Configuration Avancée
              </button>
            </div>
          </div>

          {/* Login Component */}
          {loginMode === "simple" ? (
            <SimpleEmailLogin onConnect={handleConnect} />
          ) : (
            <UniversalEmailLogin onConnect={handleConnect} />
          )}

          {/* Security Notice */}
          <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Lock className="w-4 h-4" />
              <span>
                Connexion sécurisée. Vos identifiants ne sont pas stockés sur nos serveurs.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}