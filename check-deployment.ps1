# ICONES BOX - Vérification pré-déploiement
Write-Host "🚀 ICONES BOX - Vérification pré-déploiement" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

# Vérification des variables d'environnement
Write-Host "📋 Vérification des variables d'environnement..." -ForegroundColor Yellow

if (Test-Path ".env.local") {
    Write-Host "✅ Fichier .env.local trouvé" -ForegroundColor Green
    
    $envContent = Get-Content ".env.local" -Raw
    
    if ($envContent -match "GOOGLE_CLIENT_ID") {
        Write-Host "✅ GOOGLE_CLIENT_ID configuré" -ForegroundColor Green
    } else {
        Write-Host "❌ GOOGLE_CLIENT_ID manquant" -ForegroundColor Red
    }
    
    if ($envContent -match "GOOGLE_CLIENT_SECRET") {
        Write-Host "✅ GOOGLE_CLIENT_SECRET configuré" -ForegroundColor Green
    } else {
        Write-Host "❌ GOOGLE_CLIENT_SECRET manquant" -ForegroundColor Red
    }
    
    if ($envContent -match "NEXTAUTH_SECRET") {
        Write-Host "✅ NEXTAUTH_SECRET configuré" -ForegroundColor Green
    } else {
        Write-Host "❌ NEXTAUTH_SECRET manquant" -ForegroundColor Red
        Write-Host "   Générer une clé secrète aléatoirement" -ForegroundColor Yellow
    }
    
    if ($envContent -match "GROQ_API_KEY") {
        Write-Host "✅ GROQ_API_KEY configuré (IA ultra-rapide)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ GROQ_API_KEY manquant (optionnel mais recommandé)" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "❌ Fichier .env.local manquant" -ForegroundColor Red
    Write-Host "   Créez-le en copiant .env.local.example" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Vérification des dépendances..." -ForegroundColor Yellow

try {
    npm list next-auth 2>$null | Out-Null
    Write-Host "✅ next-auth installé" -ForegroundColor Green
} catch {
    Write-Host "❌ next-auth manquant" -ForegroundColor Red
}

try {
    npm list firebase-admin 2>$null | Out-Null
    Write-Host "✅ firebase-admin installé" -ForegroundColor Green
} catch {
    Write-Host "❌ firebase-admin manquant" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔧 Test de build..." -ForegroundColor Yellow

try {
    npm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Build réussie - Prêt pour le déploiement!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Plateformes recommandées:" -ForegroundColor Cyan
        Write-Host "   1. Vercel (gratuit, optimisé Next.js)" -ForegroundColor White
        Write-Host "   2. Netlify (gratuit, simple)" -ForegroundColor White
        Write-Host "   3. Railway (payant mais complet)" -ForegroundColor White
        Write-Host ""
        Write-Host "📚 Voir DEPLOYMENT.md pour les instructions détaillées" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Erreurs de build - Consultez les logs ci-dessus" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors du build" -ForegroundColor Red
}
