import { SERVICES_PORTS } from '@app/common';
import { NestFactory } from '@nestjs/core';
import 'dotenv/config';
import { AuthServiceModule } from './auth-service.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
  await app.listen(process.env.port ?? SERVICES_PORTS.AUTH_SERVICE);
}
bootstrap();
