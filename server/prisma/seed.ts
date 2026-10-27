// Demo data for local development. Run: npm run db:seed (in server/).
// Demo accounts only: do NOT seed these passwords on a database with real users.
import { Locale, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345';
const DEMO_PASSWORD = 'Demo12345';

interface SeedUser {
  email: string;
  username: string;
  password: string;
  role?: Role;
  isBlocked?: boolean;
  isStudentVerified?: boolean;
  universityEmail?: string;
  preferredLocale?: Locale;
}

const users: SeedUser[] = [
  {
    email: 'admin@example.com',
    username: 'admin',
    password: ADMIN_PASSWORD,
    role: Role.ADMIN,
  },
  {
    email: 'aziza@example.com',
    username: 'aziza',
    password: DEMO_PASSWORD,
    preferredLocale: Locale.TG,
  },
  {
    email: 'rustam@example.com',
    username: 'rustam',
    password: DEMO_PASSWORD,
    preferredLocale: Locale.RU,
  },
  {
    email: 'madina@example.com',
    username: 'madina',
    password: DEMO_PASSWORD,
    isStudentVerified: true,
    universityEmail: 'madina@students.university.tj',
  },
  {
    email: 'blocked@example.com',
    username: 'blocked',
    password: DEMO_PASSWORD,
    isBlocked: true,
  },
];

async function main() {
  for (const { password, ...data } of users) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where: { username: data.username },
      update: { ...data, passwordHash },
      create: { ...data, passwordHash },
    });
  }
  console.log(`Seeded ${users.length} users.`);
  // Posts, comments, reports and more demo data are added on days 3 to 6.
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
