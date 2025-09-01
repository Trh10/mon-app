#!/bin/bash

echo "🚀 ICONES BOX - Vérification pré-déploiement"
echo "============================================"

# Vérification des variables d'environnement essentielles
echo "📋 Vérification des variables d'environnement..."

if [ -f ".env.local" ]; then
    echo "✅ Fichier .env.local trouvé"
    
    # Vérifier les variables critiques
    if grep -q "GOOGLE_CLIENT_ID" .env.local; then
        echo "✅ GOOGLE_CLIENT_ID configuré"
    else
        echo "❌ GOOGLE_CLIENT_ID manquant"
    fi
    
    if grep -q "GOOGLE_CLIENT_SECRET" .env.local; then
        echo "✅ GOOGLE_CLIENT_SECRET configuré"
    else
        echo "❌ GOOGLE_CLIENT_SECRET manquant"
    fi
    
    if grep -q "NEXTAUTH_SECRET" .env.local; then
        echo "✅ NEXTAUTH_SECRET configuré"
    else
        echo "❌ NEXTAUTH_SECRET manquant (générer avec: openssl rand -base64 32)"
    fi
    
    if grep -q "GROQ_API_KEY" .env.local; then
        echo "✅ GROQ_API_KEY configuré (IA ultra-rapide)"
    else
        echo "⚠️ GROQ_API_KEY manquant (optionnel mais recommandé)"
    fi
    
else
    echo "❌ Fichier .env.local manquant"
    echo "   Créez-le en copiant .env.local.example"
fi

echo ""
echo "📦 Vérification des dépendances..."
npm list next-auth > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ next-auth installé"
else
    echo "❌ next-auth manquant"
fi

npm list firebase-admin > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ firebase-admin installé"
else
    echo "❌ firebase-admin manquant"
fi

echo ""
echo "🔧 Test de build..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Build réussie - Prêt pour le déploiement!"
    echo ""
    echo "🌐 Plateformes recommandées:"
    echo "   1. Vercel (gratuit, optimisé Next.js)"
    echo "   2. Netlify (gratuit, simple)"
    echo "   3. Railway (payant mais complet)"
    echo ""
    echo "📚 Voir DEPLOYMENT.md pour les instructions détaillées"
else
    echo "❌ Erreurs de build - Consultez les logs ci-dessus"
fi
