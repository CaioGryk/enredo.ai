import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { normalizeRuntimeDatabaseUrl } from './database-url';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const databaseUrl = normalizeRuntimeDatabaseUrl(process.env.DATABASE_URL);
    super(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined);
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (error: any) {
      if (error?.errorCode === 'P1001') {
        this.logger.error(
          `Prisma P1001: Cannot reach database server at the configured DATABASE_URL. ` +
          `Supabase pooler is unreachable — check project status, IP allowlist, and network. ` +
          `The backend cannot start without a database connection.`,
        );
      } else {
        this.logger.error(
          `Prisma connection failed with a non-P1001 error. ` +
          `The backend cannot start without a database connection.`,
        );
      }
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
