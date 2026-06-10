import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { runAdminSeed } from '../admin-seed';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

describe('runAdminSeed', () => {
  let prisma: any;
  let logger: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    logger = { log: jest.fn() };
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-admin-password' as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates an admin when env vars are present and the user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await runAdminSeed(
      prisma,
      { ADMIN_EMAIL: 'admin@test.com', ADMIN_PASSWORD: 'super-secret' },
      logger,
    );

    expect(result).toBe('created');
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'admin@test.com',
        name: 'Admin User',
        passwordHash: 'hashed-admin-password',
        role: UserRole.ADMIN,
        subscription: { create: { type: 'FREE', status: 'ACTIVE' } },
        creditWallet: { create: { balance: 0 } },
      },
    });
  });

  it('skips safely when admin env vars are missing', async () => {
    await expect(runAdminSeed(prisma, { ADMIN_PASSWORD: 'secret' }, logger)).resolves.toBe('skipped-env');
    await expect(runAdminSeed(prisma, { ADMIN_EMAIL: 'admin@test.com' }, logger)).resolves.toBe('skipped-env');

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('leaves an existing ADMIN unchanged', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', role: UserRole.ADMIN });

    const result = await runAdminSeed(
      prisma,
      { ADMIN_EMAIL: 'admin@test.com', ADMIN_PASSWORD: 'secret' },
      logger,
    );

    expect(result).toBe('exists-admin');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('does not promote an existing USER to ADMIN', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'admin@test.com', role: UserRole.USER });

    const result = await runAdminSeed(
      prisma,
      { ADMIN_EMAIL: 'admin@test.com', ADMIN_PASSWORD: 'secret' },
      logger,
    );

    expect(result).toBe('exists-non-admin');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('does not expose passwords or hashes in return values or logs', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await runAdminSeed(
      prisma,
      { ADMIN_EMAIL: 'admin@test.com', ADMIN_PASSWORD: 'super-secret' },
      logger,
    );

    expect(result).toBe('created');
    expect(logger.log).not.toHaveBeenCalledWith(expect.stringContaining('super-secret'));
    expect(logger.log).not.toHaveBeenCalledWith(expect.stringContaining('hashed-admin-password'));
  });
});
