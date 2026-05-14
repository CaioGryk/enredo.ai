const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Check UserRole enum
    const enums = await prisma.$queryRaw`SELECT typname FROM pg_type WHERE typname = 'UserRole'`;
    console.log('UserRole enum rows:', enums.length > 0 ? 'EXISTS' : 'NOT FOUND');
    
    // Check role column
    const cols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role'`;
    console.log('role column:', cols.length > 0 ? 'EXISTS' : 'NOT FOUND');
    
    // Check users
    const users = await prisma.$queryRaw`SELECT email, role FROM public.users`;
    console.log('users:', users);
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
