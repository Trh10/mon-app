Write-Host "ICONES BOX - Verification pre-deploiement" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

Write-Host "Verification des variables d'environnement..." -ForegroundColor Yellow

if (Test-Path ".env.local") {
    Write-Host "Fichier .env.local trouve" -ForegroundColor Green
    
    $envContent = Get-Content ".env.local" -Raw
    
    if ($envContent -match "GOOGLE_CLIENT_ID") {
        Write-Host "GOOGLE_CLIENT_ID configure" -ForegroundColor Green
    } else {
        Write-Host "GOOGLE_CLIENT_ID manquant" -ForegroundColor Red
    }
    
    if ($envContent -match "NEXTAUTH_SECRET") {
        Write-Host "NEXTAUTH_SECRET configure" -ForegroundColor Green
    } else {
        Write-Host "NEXTAUTH_SECRET manquant" -ForegroundColor Red
    }
    
    if ($envContent -match "GROQ_API_KEY") {
        Write-Host "GROQ_API_KEY configure (IA ultra-rapide)" -ForegroundColor Green
    } else {
        Write-Host "GROQ_API_KEY manquant (optionnel)" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "Fichier .env.local manquant" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test de build..." -ForegroundColor Yellow

npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Build reussie - Pret pour le deploiement!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Plateformes recommandees:" -ForegroundColor Cyan
    Write-Host "1. Vercel (gratuit, optimise Next.js)" -ForegroundColor White
    Write-Host "2. Netlify (gratuit, simple)" -ForegroundColor White
    Write-Host "3. Railway (payant mais complet)" -ForegroundColor White
} else {
    Write-Host "Erreurs de build detectees" -ForegroundColor Red
}
