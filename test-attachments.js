// Script de test pour vérifier la récupération des attachements
const fetch = require('node-fetch');

async function testAttachments() {
  try {
    console.log('🔍 Test de récupération des attachements...\n');
    
    // Test 1: Récupérer la liste des emails pour voir ceux qui ont des attachements
    console.log('📧 Récupération de la liste des emails...');
    const emailsResponse = await fetch('http://localhost:3000/api/email/emails?folder=INBOX&skip=0&limit=20');
    
    if (!emailsResponse.ok) {
      throw new Error(`Erreur liste emails: ${emailsResponse.status}`);
    }
    
    const emailsData = await emailsResponse.json();
    console.log(`✅ ${emailsData.emails?.length || 0} emails récupérés\n`);
    
    // Chercher les emails avec attachements
    const emailsWithAttachments = emailsData.emails?.filter(email => email.hasAttachments) || [];
    console.log(`📎 ${emailsWithAttachments.length} emails avec attachements trouvés:\n`);
    
    emailsWithAttachments.forEach((email, index) => {
      console.log(`${index + 1}. ${email.subject}`);
      console.log(`   De: ${email.from}`);
      console.log(`   Date: ${email.date}`);
      console.log(`   ID: ${email.id}`);
      console.log(`   Provider: ${email.provider || 'unknown'}`);
      console.log('');
    });
    
    // Test 2: Récupérer le détail du premier email avec attachements
    if (emailsWithAttachments.length > 0) {
      const testEmail = emailsWithAttachments[0];
      console.log(`🔍 Test de récupération du détail pour: "${testEmail.subject}"\n`);
      
      const messageResponse = await fetch(`http://localhost:3000/api/email/message?id=${testEmail.id}`);
      
      if (!messageResponse.ok) {
        throw new Error(`Erreur détail message: ${messageResponse.status}`);
      }
      
      const messageData = await messageResponse.json();
      
      if (messageData.success && messageData.email) {
        const email = messageData.email;
        console.log('✅ Email récupéré avec succès!');
        console.log(`📄 Sujet: ${email.subject}`);
        console.log(`👤 De: ${email.from}`);
        console.log(`📅 Date: ${email.date}`);
        console.log(`🔗 Provider: ${email.provider}`);
        console.log(`📎 Attachements: ${email.attachments?.length || 0}\n`);
        
        if (email.attachments && email.attachments.length > 0) {
          console.log('📎 Détail des attachements:');
          email.attachments.forEach((att, index) => {
            console.log(`\n${index + 1}. ${att.filename || att.name || 'Sans nom'}`);
            console.log(`   Type MIME: ${att.mimeType || 'inconnu'}`);
            console.log(`   Taille: ${formatFileSize(att.size || 0)}`);
            console.log(`   Disposition: ${att.disposition || 'attachment'}`);
            console.log(`   Part ID: ${att.partId || att.attachmentId || 'N/A'}`);
            console.log(`   Contenu disponible: ${att.content ? 'OUI (' + (att.content.length) + ' chars)' : 'NON'}`);
          });
        } else {
          console.log('❌ Aucun attachement trouvé dans le détail');
        }
        
        // Test du contenu de l'email
        console.log(`\n📝 Contenu de l'email:`);
        console.log(`   Texte: ${email.textContent ? 'OUI (' + email.textContent.length + ' chars)' : 'NON'}`);
        console.log(`   HTML: ${email.htmlContent ? 'OUI (' + email.htmlContent.length + ' chars)' : 'NON'}`);
        console.log(`   Body: ${email.body ? 'OUI (' + email.body.length + ' chars)' : 'NON'}`);
        
      } else {
        console.log('❌ Erreur récupération détail:', messageData.error);
      }
    } else {
      console.log('⚠️ Aucun email avec attachements trouvé pour tester');
    }
    
  } catch (error) {
    console.error('❌ Erreur test:', error.message);
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Exécuter le test
testAttachments();
