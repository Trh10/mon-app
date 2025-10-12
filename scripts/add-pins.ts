import { PrismaClient } from '@prisma/client';
import { hashPin } from '../src/lib/hash';

const prisma = new PrismaClient();

async function addPinsToUsers() {
  console.log('🔐 Ajout des PINs aux utilisateurs existants...\n');

  try {
    // Récupérer tous les utilisateurs sans PIN
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { pinHash: null },
          { pinHash: '' }
        ]
      }
    });

    if (users.length === 0) {
      console.log('✅ Tous les utilisateurs ont déjà un PIN\n');
      return;
    }

    console.log(`📝 ${users.length} utilisateurs sans PIN trouvés\n`);

    // PIN par défaut pour tous : 1234
    const defaultPin = '1234';
    const hashedPin = await hashPin(defaultPin);

    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { pinHash: hashedPin }
      });
      console.log(`  ✅ PIN ajouté pour: ${user.name} (PIN: ${defaultPin})`);
    }

    console.log(`\n🎉 PINs ajoutés avec succès !`);
    console.log(`\n⚠️  IMPORTANT: Le PIN par défaut est "1234" pour tous les utilisateurs`);
    console.log(`   Demandez aux utilisateurs de le changer après la première connexion.\n`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addPinsToUsers();
