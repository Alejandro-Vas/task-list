import './load-env';

import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

const SWAGGER_PATH = 'docs';

function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Task List API')
    .setDescription(
      'Tasks API with JWT auth (access token in httpOnly cookie + Bearer) ' +
        'and BullMQ notifications. Cookies are sent automatically from Swagger UI.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token (paste accessToken from /api/auth/login).',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    useGlobalPrefix: true,
    jsonDocumentUrl: `${SWAGGER_PATH}/json`,
    swaggerOptions: { persistAuthorization: true },
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({ origin: true, credentials: true });

  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);

  console.log(`API is running on http://localhost:${port}/api`);
}

void bootstrap();
