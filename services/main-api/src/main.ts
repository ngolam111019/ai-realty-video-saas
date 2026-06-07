import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Polyfill to support BigInt serialization in JSON responses
(BigInt.prototype as any).toJSON = function () {
  const num = Number(this);
  return Number.isSafeInteger(num) ? num : this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:3002', 'http://localhost:3000'],
    credentials: true,
  });
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.info(`[main-api] NestJS Server running on port ${port}`);
}
bootstrap();
