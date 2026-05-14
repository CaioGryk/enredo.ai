const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.log('ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin creation.');
    return;
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`Admin user ${adminEmail} already exists.`);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      name: 'Admin',
      role: UserRole.ADMIN,
    },
  });

  console.log(`Admin user created: ${admin.email} (role: ${admin.role})`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
