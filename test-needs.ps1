# Test de l'API de gestion des besoins
Write-Host "🚀 Test de l'API de gestion des besoins" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Test 1: Connexion et création de la première entreprise
Write-Host "`n1. Test de connexion..." -ForegroundColor Yellow
try {
    $loginBody = @{
        code = "1234"
        name = "terach"
        companyName = "sokolo"
    } | ConvertTo-Json

    $loginResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -SessionVariable session
    
    if ($loginResponse.StatusCode -eq 200) {
        $loginData = $loginResponse.Content | ConvertFrom-Json
        Write-Host "✅ Connexion réussie" -ForegroundColor Green
        Write-Host "   Utilisateur: $($loginData.user.name) ($($loginData.user.code))" -ForegroundColor Gray
        Write-Host "   Entreprise: $($loginData.user.companyCode)" -ForegroundColor Gray
        Write-Host "   Niveau: $($loginData.user.level) - $($loginData.user.levelName)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Échec de la connexion" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur de connexion: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Récupération des besoins
Write-Host "`n2. Test de récupération des besoins..." -ForegroundColor Yellow
try {
    $needsResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/needs" -Method GET -WebSession $session
    
    if ($needsResponse.StatusCode -eq 200) {
        $needsData = $needsResponse.Content | ConvertFrom-Json
        Write-Host "✅ Besoins récupérés: $($needsData.needs.Count) besoins trouvés" -ForegroundColor Green
        
        foreach ($need in $needsData.needs) {
            Write-Host "   • $($need.title)" -ForegroundColor Gray
            Write-Host "     Catégorie: $($need.category) | Priorité: $($need.priority)" -ForegroundColor Gray
            Write-Host "     Budget: $($need.budget)€ | Statut: $($need.status)" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Échec de récupération des besoins" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Création d'un nouveau besoin
Write-Host "`n3. Test de création d'un nouveau besoin..." -ForegroundColor Yellow
try {
    $newNeedBody = @{
        title = "Test - Nouveau logiciel PowerShell"
        description = "Logiciel de gestion de projet pour l'équipe"
        category = "logiciel"
        priority = "moyenne"
        budget = 750
        justification = "Améliorer la productivité de l'équipe avec PowerShell"
    } | ConvertTo-Json

    $createResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/needs" -Method POST -ContentType "application/json" -Body $newNeedBody -WebSession $session
    
    if ($createResponse.StatusCode -eq 201) {
        $createData = $createResponse.Content | ConvertFrom-Json
        Write-Host "✅ Nouveau besoin créé avec succès" -ForegroundColor Green
        Write-Host "   ID: $($createData.need.id)" -ForegroundColor Gray
        Write-Host "   Titre: $($createData.need.title)" -ForegroundColor Gray
        Write-Host "   Statut: $($createData.need.status)" -ForegroundColor Gray
        Write-Host "   Workflow: $($createData.need.workflow.Count) étapes créées" -ForegroundColor Gray
    } else {
        Write-Host "❌ Échec de création du besoin" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la création: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Workflow
Write-Host "`n4. Test du workflow..." -ForegroundColor Yellow
try {
    $workflowResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/needs/workflow" -Method GET -WebSession $session
    
    if ($workflowResponse.StatusCode -eq 200) {
        $workflowData = $workflowResponse.Content | ConvertFrom-Json
        Write-Host "✅ Workflow: $($workflowData.pendingReviews.Count) révisions en attente" -ForegroundColor Green
        
        foreach ($review in $workflowData.pendingReviews) {
            Write-Host "   • Besoin: $($review.needTitle)" -ForegroundColor Gray
            Write-Host "     Demandeur: $($review.requesterName)" -ForegroundColor Gray
            Write-Host "     Budget: $($review.budget)€" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Échec du workflow" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur workflow: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Tests terminés !" -ForegroundColor Green
Write-Host "Vous pouvez maintenant aller sur http://localhost:3000/needs pour voir l'interface" -ForegroundColor Cyan
