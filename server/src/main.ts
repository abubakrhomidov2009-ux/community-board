import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  setupSwagger(app);
  const server = await app.listen(process.env.PORT ?? 4000);
  // Proxies (the Next.js rewrite, Render, Vercel) reuse idle connections. Node closes them after 5 seconds by
  // default, so a proxy sometimes sent a request down a connection that was just closed (ECONNRESET, HTTP 500).
  // Keeping them open longer than any proxy does avoids that.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}
void bootstrap();
