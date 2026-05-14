import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const configuredFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const localDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin === configuredFrontendUrl || localDevOrigin.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  });

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

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Enredo API running on http://localhost:${port}`);
  console.log(`📚 API Docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
