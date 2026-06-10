import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

type AdminSeedPrisma = Pick<PrismaClient, 'user'>;

type AdminSeedEnv = {
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
};

type AdminSeedLogger = Pick<Console, 'log'>;

export type AdminSeedResult = 'skipped-env' | 'created' | 'exists-admin' | 'exists-non-admin';

export async function runAdminSeed(
  prisma: AdminSeedPrisma,
  env: AdminSeedEnv = process.env,
  logger: AdminSeedLogger = console,
): Promise<AdminSeedResult> {
  const adminEmail = env.ADMIN_EMAIL?.trim();
  const adminPassword = env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    logger.log('ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin creation.');
    return 'skipped-env';
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    if (existing.role === UserRole.ADMIN) {
      logger.log(`Admin user already exists with ADMIN role: ${adminEmail}`);
      return 'exists-admin';
    }

    logger.log(`User ${adminEmail} already exists with role ${existing.role}. Not promoting to ADMIN.`);
    return 'exists-non-admin';
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Admin User',
      passwordHash,
      role: UserRole.ADMIN,
      subscription: { create: { type: 'FREE', status: 'ACTIVE' } },
      creditWallet: { create: { balance: 0 } },
    },
  });

  logger.log(`Admin user created with ADMIN role: ${adminEmail}`);
  return 'created';
}
