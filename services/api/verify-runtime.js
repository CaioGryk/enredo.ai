const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // 1. Check UserRole enum
    const enums = await prisma.$queryRaw`SELECT typname FROM pg_type WHERE typname = 'UserRole'`;
    console.log('1. UserRole enum exists:', enums.length > 0 ? 'YES' : 'NO');
    
    // 2. Check role column
    const cols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'`;
    console.log('2. users.role column exists:', cols.length > 0 ? 'YES' : 'NO');
    
    // 3. Check users with roles
    const users = await prisma.$queryRaw`SELECT email, role FROM public.users`;
    console.log('3. Existing users:', JSON.stringify(users, null, 2));
    
    // 4. Check admin user
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    console.log('4. Admin user exists:', adminUser ? 'YES' : 'NO');
    if (adminUser) console.log('   Admin email:', adminUser.email);
    
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
