import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { runAdminSeed } from '../src/admin-seed';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  await runAdminSeed(prisma);
}

main()
  .catch((e) => {
    console.error('Admin seed failed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
