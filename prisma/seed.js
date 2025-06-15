const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('admin1234', 10); // Mot de passe clair → hashé

    // Créer un admin
    await prisma.user.upsert({
        where: { email: 'lycoris@blue.com' },
        update: {},
        create: {
            email: 'lycoris@blue.com',
            passwordHash: hashedPassword,
            firstName: 'Admin',
            lastName: 'Systeme',
            role: 'ADMIN',
        },
    });

    const servicesData = [
        { name: 'Pompiers', serviceType: 'Incendie', contactNumber: '112' },
        { name: 'Police Nationale', serviceType: 'Sécurité', contactNumber: '17' },
        { name: 'SAMU', serviceType: 'Urgence médicale', contactNumber: '15' },
        { name: 'Protection Civile', serviceType: 'Secours divers', contactNumber: '114' },
    ];

    const rescueServices = [];

    for (const data of servicesData) {
        const service = await prisma.rescueService.create({ data });
        rescueServices.push(service);
    }

    // Créer des membres avec le mot de passe hashé
    for (let i = 0; i < rescueServices.length; i++) {
        await prisma.user.create({
            data: {
                email: `secours${i + 1}@example.com`,
                passwordHash: await bcrypt.hash(`secours123${i + 1}`, 10),
                firstName: `Membre${i + 1}`,
                lastName: `Service${i + 1}`,
                role: 'RESCUE_MEMBER',
                rescueMember: {
                    create: {
                        badgeNumber: `RM00${i + 1}`,
                        position: 'Intervenant',
                        rescueServiceId: rescueServices[i].id,
                    },
                },
            },
        });
    }

    console.log('✅ Admin et membres des secours créés avec mots de passe hashés.');
}

main()
    .then(() => prisma.$disconnect())
    .catch(e => {
        console.error('Erreur lors du seed :', e);
        prisma.$disconnect();
        process.exit(1);
    });
