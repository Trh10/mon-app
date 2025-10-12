# ============================================================
# SCRIPT DE DÉPLOIEMENT AUTOMATISÉ - ICONES BOX
# Vérifie et prépare le projet pour le déploiement Vercel
# ============================================================

Write-Host "🚀 ICONES BOX - Préparation au déploiement" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Fonction pour afficher les étapes
function Write-Step {
    param($Step, $Message)
    Write-Host "[$Step] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message -ForegroundColor White
}

function Write-Success {
    param($Message)
    Write-Host "  ✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param($Message)
    Write-Host "  ❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param($Message)
    Write-Host "  ℹ️  $Message" -ForegroundColor Cyan
}

# ============================================================
# ÉTAPE 1 : Vérifier les prérequis
# ============================================================
Write-Step "1/7" "Vérification des prérequis"

# Vérifier Node.js
try {
    $nodeVersion = node --version
    Write-Success "Node.js installé : $nodeVersion"
} catch {
    Write-Error "Node.js non trouvé. Installer depuis https://nodejs.org"
    exit 1
}

# Vérifier npm
try {
    $npmVersion = npm --version
    Write-Success "npm installé : $npmVersion"
} catch {
    Write-Error "npm non trouvé"
    exit 1
}

# Vérifier .env
if (Test-Path ".env") {
    Write-Success "Fichier .env trouvé"
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "DATABASE_URL") {
        Write-Success "DATABASE_URL configurée"
    } else {
        Write-Error "DATABASE_URL manquante dans .env"
        exit 1
    }
} else {
    Write-Error "Fichier .env manquant"
    exit 1
}

Write-Host ""

# ============================================================
# ÉTAPE 2 : Installer les dépendances
# ============================================================
Write-Step "2/7" "Installation des dépendances"

try {
    npm install --silent
    Write-Success "Dépendances installées"
} catch {
    Write-Error "Erreur lors de l'installation des dépendances"
    exit 1
}

Write-Host ""

# ============================================================
# ÉTAPE 3 : Générer le client Prisma
# ============================================================
Write-Step "3/7" "Génération du client Prisma"

try {
    npm run prisma:generate --silent
    Write-Success "Client Prisma généré"
} catch {
    Write-Error "Erreur lors de la génération du client Prisma"
    exit 1
}

Write-Host ""

# ============================================================
# ÉTAPE 4 : Vérifier le build
# ============================================================
Write-Step "4/7" "Vérification du build Next.js"

Write-Info "Cette étape peut prendre quelques minutes..."
$buildOutput = npm run build 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Success "Build réussi !"
    
    # Extraire les statistiques
    if ($buildOutput -match "Route \(app\)") {
        Write-Info "Routes générées :"
        $buildOutput -split "`n" | Where-Object { $_ -match "^[├└]" } | Select-Object -First 10 | ForEach-Object {
            Write-Host "    $_" -ForegroundColor Gray
        }
        Write-Host "    ..." -ForegroundColor Gray
    }
} else {
    Write-Error "Build échoué. Voir les erreurs ci-dessus."
    exit 1
}

Write-Host ""

# ============================================================
# ÉTAPE 5 : Vérifier les données à migrer
# ============================================================
Write-Step "5/7" "Vérification des données JSON"

$dataFiles = @("data/users.json", "data/email-accounts.json", "data/audit-logs.json")
$foundFiles = 0

foreach ($file in $dataFiles) {
    if (Test-Path $file) {
        $data = Get-Content $file -Raw | ConvertFrom-Json
        $count = $data.Count
        Write-Success "$file : $count enregistrements"
        $foundFiles++
    } else {
        Write-Info "$file : non trouvé (optionnel)"
    }
}

if ($foundFiles -eq 0) {
    Write-Info "Aucune donnée JSON à migrer (base vide)"
}

Write-Host ""

# ============================================================
# ÉTAPE 6 : Vérifier le schéma Prisma
# ============================================================
Write-Step "6/7" "Vérification du schéma Prisma"

if (Test-Path "schema.prisma") {
    $schema = Get-Content "schema.prisma" -Raw
    
    # Compter les modèles
    $models = ($schema | Select-String -Pattern "^model\s+\w+" -AllMatches).Matches.Count
    Write-Success "Schéma Prisma : $models modèles trouvés"
    
    # Vérifier les tables critiques
    $criticalTables = @("Organization", "User", "Task", "Message", "Requisition")
    foreach ($table in $criticalTables) {
        if ($schema -match "model $table") {
            Write-Success "  ✓ Table $table"
        } else {
            Write-Error "  ✗ Table $table manquante"
        }
    }
} else {
    Write-Error "schema.prisma manquant"
    exit 1
}

Write-Host ""

# ============================================================
# ÉTAPE 7 : Préparer le déploiement
# ============================================================
Write-Step "7/7" "Préparation du déploiement"

# Créer un fichier .vercelignore si absent
if (-not (Test-Path ".vercelignore")) {
    @"
.env.local
.env
.data
node_modules
.next
data/*.json
mon-app
"@ | Out-File -FilePath ".vercelignore" -Encoding utf8
    Write-Success "Fichier .vercelignore créé"
}

# Vérifier Git
try {
    $gitStatus = git status 2>&1
    if ($gitStatus -match "nothing to commit") {
        Write-Success "Repository Git à jour"
    } else {
        Write-Info "Changements Git en attente de commit"
        Write-Host "    Fichiers modifiés :" -ForegroundColor Gray
        git status --short | ForEach-Object {
            Write-Host "      $_" -ForegroundColor Gray
        }
    }
} catch {
    Write-Info "Git non initialisé ou non trouvé"
}

Write-Host ""

# ============================================================
# RÉSUMÉ
# ============================================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ PRÉPARATION TERMINÉE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 PROCHAINES ÉTAPES :" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  MIGRER LES DONNÉES (optionnel)" -ForegroundColor White
Write-Host "    npm run migrate:json" -ForegroundColor Cyan
Write-Host ""
Write-Host "2️⃣  CONFIGURER RLS SUR NEON" -ForegroundColor White
Write-Host "    - Ouvrir console.neon.tech" -ForegroundColor Cyan
Write-Host "    - SQL Editor > Coller scripts/setup-rls.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "3️⃣  DÉPLOYER SUR VERCEL" -ForegroundColor White
Write-Host "    - Aller sur vercel.com" -ForegroundColor Cyan
Write-Host "    - New Project > Importer repository" -ForegroundColor Cyan
Write-Host "    - Ajouter DATABASE_URL dans Environment Variables" -ForegroundColor Cyan
Write-Host "    - Deploy !" -ForegroundColor Cyan
Write-Host ""
Write-Host "4️⃣  TESTER L'APPLICATION" -ForegroundColor White
Write-Host "    - Login multi-locataire" -ForegroundColor Cyan
Write-Host "    - Fonctionnalités (Email, Chat, Tâches, etc.)" -ForegroundColor Cyan
Write-Host ""
Write-Host "📄 Documentation complète : GUIDE-DEPLOIEMENT-FINAL.md" -ForegroundColor Magenta
Write-Host ""
Write-Host "🎉 Bon déploiement !" -ForegroundColor Green
Write-Host ""
