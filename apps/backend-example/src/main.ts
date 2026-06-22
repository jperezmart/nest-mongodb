import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  // Closes the Mongo client (OnApplicationShutdown) on SIGINT/SIGTERM.
  app.enableShutdownHooks();
  app.enableCors();
  const port = Number(process.env['PORT'] ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`backend-example listening on http://localhost:${port}`);
}

void bootstrap();
