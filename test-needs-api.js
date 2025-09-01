const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('🚀 Test de l\'API de gestion des besoins');
  console.log('=====================================');
  
  try {
    // 1. Test de connexion pour créer la première entreprise
    console.log('\n1. Création de la première entreprise et connexion...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: '1234',
        name: 'terach',
        companyName: 'sokolo'
      }),
    });

    const loginData = await loginResponse.json();
    console.log('Connexion:', loginData.success ? '✅ Réussie' : '❌ Échec');
    if (loginData.success) {
      console.log(`   Utilisateur: ${loginData.user.name} (${loginData.user.code})`);
      console.log(`   Entreprise: ${loginData.user.companyCode}`);
      console.log(`   Niveau: ${loginData.user.level} - ${loginData.user.levelName}`);
    } else {
      console.log(`   Erreur: ${loginData.message || loginData.error}`);
    }

    // 2. Test de récupération des besoins
    console.log('\n2. Récupération des besoins...');
    const needsResponse = await fetch(`${BASE_URL}/api/needs`, {
      headers: {
        'Cookie': loginResponse.headers.get('set-cookie') || ''
      }
    });

    if (needsResponse.ok) {
      const needsData = await needsResponse.json();
      console.log(`✅ Besoins récupérés: ${needsData.needs.length} besoins trouvés`);
      
      needsData.needs.forEach((need, index) => {
        console.log(`   ${index + 1}. ${need.title}`);
        console.log(`      Catégorie: ${need.category} | Priorité: ${need.priority}`);
        console.log(`      Budget: ${need.budget}€ | Statut: ${need.status}`);
        console.log(`      Workflow: ${need.workflow.length} étapes`);
      });
    } else {
      console.log('❌ Erreur lors de la récupération des besoins');
      const error = await needsResponse.text();
      console.log(`   Erreur: ${error}`);
    }

    // 3. Test de création d'un nouveau besoin
    console.log('\n3. Création d\'un nouveau besoin...');
    const newNeed = {
      title: 'Test - Nouveau logiciel',
      description: 'Logiciel de gestion de projet pour l\'équipe',
      category: 'logiciel',
      priority: 'moyenne',
      budget: 500,
      justification: 'Améliorer la productivité de l\'équipe'
    };

    const createResponse = await fetch(`${BASE_URL}/api/needs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': loginResponse.headers.get('set-cookie') || ''
      },
      body: JSON.stringify(newNeed),
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('✅ Nouveau besoin créé avec succès');
      console.log(`   ID: ${createData.need.id}`);
      console.log(`   Statut: ${createData.need.status}`);
      console.log(`   Workflow: ${createData.need.workflow.length} étapes créées`);
    } else {
      console.log('❌ Erreur lors de la création du besoin');
      const error = await createResponse.text();
      console.log(`   Erreur: ${error}`);
    }

    // 4. Test du workflow (approbation)
    console.log('\n4. Test du workflow d\'approbation...');
    const workflowResponse = await fetch(`${BASE_URL}/api/needs/workflow`, {
      headers: {
        'Cookie': loginResponse.headers.get('set-cookie') || ''
      }
    });

    if (workflowResponse.ok) {
      const workflowData = await workflowResponse.json();
      console.log(`✅ Workflow: ${workflowData.pendingReviews.length} révisions en attente`);
      
      workflowData.pendingReviews.forEach((review, index) => {
        console.log(`   ${index + 1}. Besoin: ${review.needTitle}`);
        console.log(`      Demandeur: ${review.requesterName}`);
        console.log(`      Budget: ${review.budget}€`);
        console.log(`      En attente depuis: ${new Date(review.createdAt).toLocaleDateString()}`);
      });
    } else {
      console.log('❌ Erreur lors de la récupération du workflow');
    }

    console.log('\n🎉 Test terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
  }
}

// Lancer le test
testAPI();
