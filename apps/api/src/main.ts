import './load-env';

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({ origin: true, credentials: true });


  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);

  console.log(`API is running on http://localhost:${port}/api`);
}

void bootstrap();
