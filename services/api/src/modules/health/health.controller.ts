import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@common/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async check() {
    const timestamp = new Date().toISOString();
    
    let databaseStatus = 'unknown';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'ok';
    } catch {
      databaseStatus = 'error';
    }

    return {
      status: databaseStatus === 'ok' ? 'ok' : 'degraded',
      service: 'enredo-api',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || process.env.npm_package_version || '0.1.0',
      timestamp,
      database: databaseStatus,
    };
  }
}
