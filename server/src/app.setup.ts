import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { createValidationPipe } from './common/pipes/validation.pipe';

/**
 * Everything the app needs, used by main.ts and by the end-to-end tests,
 * so tests run against the same setup as the real server.
 */
export function configureApp(app: NestExpressApplication): void {
  // Render (and most hosts) put a proxy in front of the app.
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
}

/** Swagger UI at /api/docs and the raw OpenAPI JSON at /api/docs-json. */
export function setupSwagger(app: NestExpressApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Community Board API')
    .setDescription(
      'REST API for Community Board (Dushanbe).\n\n' +
        '**How to log in here:** call `POST /api/auth/login`. The browser keeps the `access_token` cookie, ' +
        'so protected endpoints work with "Try it out".\n\n' +
        'Errors always look like `{ statusCode, errorCode, message, details }`. Use `errorCode`, not `message`.',
    )
    .setVersion('1.0.0')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });
}
