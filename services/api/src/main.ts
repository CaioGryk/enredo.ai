import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validateEnv } from './common/env-validation';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { RequestLoggingInterceptor } from './common/request-logging.interceptor';

async function bootstrap() {
  validateEnv(Logger.log.bind(Logger));

  const app = await NestFactory.create(AppModule);

  const requestIdMiddleware = new RequestIdMiddleware();
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));
  app.useGlobalInterceptors(new RequestLoggingInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const allowedOriginsRaw = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000';
  const allowedOrigins = allowedOriginsRaw.split(',').map((o) => o.trim()).filter(Boolean);
  const isDev = (process.env.NODE_ENV || 'development') === 'development' || process.env.NODE_ENV === 'test';
  const localDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2):\d+$/;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) { callback(null, true); return; }
      if (isDev && localDevOrigin.test(origin)) { callback(null, true); return; }
      if (allowedOrigins.includes(origin)) { callback(null, true); return; }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  });

  const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Enredo API')
      .setDescription('Interactive AI Storytelling Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('library', 'Stories and characters')
      .addTag('reading', 'Reading sessions and narrative events')
      .addTag('billing', 'Subscriptions and credits')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  Logger.log(`🚀 Enredo API running on http://localhost:${port}`, 'Bootstrap');
  if (swaggerEnabled) {
    Logger.log(`📚 API Docs available at http://localhost:${port}/api/docs`, 'Bootstrap');
  }
}

bootstrap();
