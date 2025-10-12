// Script de seed pour créer des données de test
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding...');

  // Créer une organisation
  const org = await prisma.organization.upsert({
    where: { slug: 'icones-demo' },
    update: {},
    create: {
      name: 'ICONES Demo',
      slug: 'icones-demo',
    },
  });
  console.log('✅ Organisation créée:', org.name);

  // Créer un utilisateur admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@icones-demo.com' },
    update: {},
    create: {
      email: 'admin@icones-demo.com',
      name: 'Administrateur',
      displayName: 'Admin ICONES',
      role: 'admin',
      organizationId: org.id,
      pinHash: '1234', // En production, utilisez bcrypt!
    },
  });
  console.log('✅ Admin créé:', admin.email);

  // Créer un utilisateur manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@icones-demo.com' },
    update: {},
    create: {
      email: 'manager@icones-demo.com',
      name: 'Manager',
      displayName: 'Manager ICONES',
      role: 'user',
      organizationId: org.id,
      pinHash: '5678',
    },
  });
  console.log('✅ Manager créé:', manager.email);

  // Créer un employé
  const employee = await prisma.user.upsert({
    where: { email: 'employe@icones-demo.com' },
    update: {},
    create: {
      email: 'employe@icones-demo.com',
      name: 'Employé',
      displayName: 'Employé ICONES',
      role: 'user',
      organizationId: org.id,
      pinHash: '9999',
    },
  });
  console.log('✅ Employé créé:', employee.email);

  console.log('\n🎉 Seeding terminé avec succès!\n');
  console.log('📝 Identifiants de test:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 Admin:');
  console.log(`   Email: ${admin.email}`);
  console.log(`   PIN:   1234`);
  console.log('');
  console.log('👤 Manager:');
  console.log(`   Email: ${manager.email}`);
  console.log(`   PIN:   5678`);
  console.log('');
  console.log('👤 Employé:');
  console.log(`   Email: ${employee.email}`);
  console.log(`   PIN:   9999`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n💡 Organisation: icones-demo');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erreur lors du seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
