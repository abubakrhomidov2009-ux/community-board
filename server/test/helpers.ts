import { INestApplication, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { Locale, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp, setupSwagger } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export const PASSWORD = 'Test12345';

export interface TestContext {
  app: NestExpressApplication;
  prisma: PrismaService;
}

/** Creates the real app (same setup as main.ts). Pass `customise` to replace providers such as the mail service. */
export async function createTestApp(
  customise?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<TestContext> {
  // Tests also simulate failures (Cloudinary down...), which the app logs as errors. Keep the output quiet:
  // set E2E_LOGS=true to see the logs when a test fails.
  if (process.env.E2E_LOGS !== 'true') Logger.overrideLogger(false);
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (customise) builder = customise(builder);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  setupSwagger(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Empties every table so each test file starts from nothing. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Message","ConversationParticipant","Conversation","Notification","Report","Favorite","Comment","PostImage","EmailVerificationToken","Post","User" RESTART IDENTITY CASCADE',
  );
}

interface NewUser {
  username: string;
  role?: Role;
  isBlocked?: boolean;
  isStudentVerified?: boolean;
  universityEmail?: string;
  preferredLocale?: Locale;
}

/** Inserts a user directly in the database (fast, and the only way to create an admin). Password: Test12345. */
export async function createUser(prisma: PrismaService, input: NewUser) {
  return prisma.user.create({
    data: {
      email: `${input.username}@example.com`,
      username: input.username,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      role: input.role ?? Role.USER,
      isBlocked: input.isBlocked ?? false,
      isStudentVerified: input.isStudentVerified ?? false,
      universityEmail: input.universityEmail,
      preferredLocale: input.preferredLocale ?? Locale.EN,
    },
  });
}

/** A browser-like client that keeps cookies, logged in as that user (through the real login endpoint). */
export async function loginAs(app: INestApplication, username: string) {
  const agent = request.agent(app.getHttpServer() as never);
  const response = await agent
    .post('/api/auth/login')
    .send({ emailOrUsername: username, password: PASSWORD });
  if (response.status !== 200) {
    throw new Error(
      `Test login for ${username} failed with ${response.status}: ${JSON.stringify(response.body)}`,
    );
  }
  return agent;
}

/** A client that is logged in by a ready-made token (does not use the login endpoint, so it ignores the login rate limit). */
export function clientWithToken(app: INestApplication, userId: string) {
  const token = app.get(JwtService).sign({ sub: userId });
  return request
    .agent(app.getHttpServer() as never)
    .set('Cookie', `access_token=${token}`);
}

/** A client without a login. */
export function guestClient(app: INestApplication) {
  return request.agent(app.getHttpServer() as never);
}

/** Typed access to a response body (supertest gives `any`). */
export function bodyOf<T = Record<string, unknown>>(response: {
  body: unknown;
}): T {
  return response.body as T;
}

export const validPost = {
  title: 'Math tutor for first-year students',
  description: 'I teach calculus and linear algebra. Free first lesson.',
  category: 'TUTORING',
  district: 'UNIVERSITY_CAMPUS',
  price: 100,
  priceUnit: 'PER_HOUR',
  contactTelegram: 'aziza_tutor',
};
