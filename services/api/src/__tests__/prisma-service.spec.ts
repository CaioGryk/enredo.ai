import { PrismaService } from '@common/prisma.service';
import { normalizeRuntimeDatabaseUrl } from '@common/database-url';

describe('normalizeRuntimeDatabaseUrl', () => {
  it('adds sslmode=require to Supabase Postgres URLs when missing', () => {
    const result = normalizeRuntimeDatabaseUrl('postgresql://user:pass@aws-1-sa-east-1.pooler.supabase.com:6543/postgres');

    expect(result).toContain('sslmode=require');
  });

  it('adds PgBouncer-safe params to Supabase pooler URLs', () => {
    const result = normalizeRuntimeDatabaseUrl('postgresql://user:pass@aws-1-sa-east-1.pooler.supabase.com:6543/postgres');

    expect(result).toContain('pgbouncer=true');
    expect(result).toContain('connection_limit=1');
  });

  it('does not override existing sslmode', () => {
    const result = normalizeRuntimeDatabaseUrl('postgresql://user:pass@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=prefer');

    expect(result).toContain('sslmode=prefer');
  });

  it('does not override explicit Supabase pooler connection_limit', () => {
    const result = normalizeRuntimeDatabaseUrl(
      'postgresql://user:pass@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&sslmode=require',
    );

    expect(result).toContain('pgbouncer=true');
    expect(result).toContain('connection_limit=5');
    expect(result).not.toContain('connection_limit=1');
  });

  it('does not change non-Supabase URLs', () => {
    const url = 'postgresql://user:pass@localhost:5432/postgres';

    expect(normalizeRuntimeDatabaseUrl(url)).toBe(url);
  });
});

describe('PrismaService', () => {
  describe('onModuleInit', () => {
    it('should rethrow Prisma P1001 connection error after logging', async () => {
      const service = new PrismaService();
      const p1001Error: any = new Error('Prisma connection error');
      p1001Error.errorCode = 'P1001';

      const connectSpy = jest.spyOn(service, '$connect').mockRejectedValue(p1001Error);
      const logSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});

      await expect(service.onModuleInit()).rejects.toThrow('Prisma connection error');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('P1001'),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('cannot start'),
      );

      connectSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('should rethrow generic Prisma connection error after logging', async () => {
      const service = new PrismaService();
      const genericError = new Error('Connection refused');

      jest.spyOn(service, '$connect').mockRejectedValue(genericError);
      const logSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});

      await expect(service.onModuleInit()).rejects.toThrow('Connection refused');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('cannot start'),
      );
      expect(logSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Connection refused'),
      );
      jest.restoreAllMocks();
    });
  });
});
