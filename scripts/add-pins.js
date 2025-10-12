const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Fonction de hashage directement dans le script
async function hashPin(pin) {
  const iterations = 100000;
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, salt, iterations, 64, 'sha512').toString('hex');
  return `${iterations}:${salt}:${hash}`;
}

async function addPinsToUsers() {
  console.log('🔐 Ajout des PINs aux utilisateurs existants...\n');

  try {
    // Récupérer tous les utilisateurs
    const users = await prisma.user.findMany();

    console.log(`📝 ${users.length} utilisateurs trouvés\n`);

    // PIN par défaut pour tous : 1234
    const defaultPin = '1234';

    for (const user of users) {
      if (!user.pinHash || user.pinHash === '') {
        const hashedPin = await hashPin(defaultPin);
        await prisma.user.update({
          where: { id: user.id },
          data: { pinHash: hashedPin }
        });
        console.log(`  ✅ PIN ajouté pour: ${user.name} (PIN par défaut: ${defaultPin})`);
      } else {
        console.log(`  ⏭️  ${user.name} a déjà un PIN`);
      }
    }

    console.log(`\n🎉 Opération terminée !`);
    console.log(`\n⚠️  IMPORTANT: Le PIN par défaut est "1234" pour les nouveaux utilisateurs`);
    console.log(`   Changez-le après la première connexion.\n`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addPinsToUsers();
