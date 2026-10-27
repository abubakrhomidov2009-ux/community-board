// Demo data for local development. Run: npm run db:seed (in server/).
// Demo accounts only: do NOT seed these passwords on a database with real users.
import {
  Category,
  District,
  Locale,
  PostStatus,
  PriceUnit,
  PrismaClient,
  Role,
} from '@prisma/client';
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

  await seedPosts();
  // Reports, favorites, notifications and messages are added on days 4 to 6.
}

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY);

// Fixed ids make the seed safe to run many times (it updates instead of duplicating).
interface SeedPost {
  id: string;
  author: string;
  title: string;
  description: string;
  category: Category;
  district: District;
  status?: PostStatus;
  price?: number;
  priceUnit?: PriceUnit;
  contactTelegram?: string;
  contactPhone?: string;
  latitude?: number;
  longitude?: number;
  createdDaysAgo: number;
  expiresInDays?: number;
  removedReason?: string;
}

const posts: SeedPost[] = [
  {
    id: 'seed-post-math',
    author: 'aziza',
    title: 'Math tutor for first-year students',
    description:
      'I teach calculus and linear algebra. Online or at the university library. The first lesson is free.',
    category: Category.TUTORING,
    district: District.UNIVERSITY_CAMPUS,
    price: 100,
    priceUnit: PriceUnit.PER_HOUR,
    contactTelegram: 'aziza_tutor',
    createdDaysAgo: 2,
  },
  {
    id: 'seed-post-english',
    author: 'rustam',
    title: 'English conversation practice',
    description:
      'Small groups of 3 to 4 people. We speak only English and prepare for IELTS. Evenings, Monday to Friday.',
    category: Category.TUTORING,
    district: District.SINO,
    price: 80,
    priceUnit: PriceUnit.PER_HOUR,
    contactPhone: '+992901112233',
    createdDaysAgo: 5,
  },
  {
    id: 'seed-post-programming',
    author: 'madina',
    title: 'Learn Python from zero',
    description:
      'Patient lessons for beginners. We build small programs together. I am a computer science student.',
    category: Category.TUTORING,
    district: District.FIRDAVSI,
    price: 150,
    priceUnit: PriceUnit.PER_HOUR,
    contactTelegram: 'madina_codes',
    createdDaysAgo: 1,
  },
  {
    id: 'seed-post-room-campus',
    author: 'rustam',
    title: 'Room near the university campus',
    description:
      'Clean room in a shared flat, 10 minutes on foot from the campus. Internet and water included. Only students, please.',
    category: Category.RENTALS,
    district: District.UNIVERSITY_CAMPUS,
    price: 1200,
    priceUnit: PriceUnit.PER_MONTH,
    contactPhone: '+992902223344',
    latitude: 38.5598,
    longitude: 68.787,
    createdDaysAgo: 3,
  },
  {
    id: 'seed-post-flat',
    author: 'aziza',
    title: '2-room apartment, Shohmansur',
    description:
      'Furnished apartment on the 3rd floor. Quiet street, near the bus stop. Contract for at least 6 months.',
    category: Category.RENTALS,
    district: District.SHOHMANSUR,
    price: 2500,
    priceUnit: PriceUnit.PER_MONTH,
    contactTelegram: 'aziza_rent',
    latitude: 38.5737,
    longitude: 68.7739,
    createdDaysAgo: 8,
  },
  {
    id: 'seed-post-bed',
    author: 'madina',
    title: 'Bed in a girls-only flat',
    description:
      'One free bed in a friendly flat with two other students. Kitchen and washing machine are shared.',
    category: Category.RENTALS,
    district: District.ISMOILI_SOMONI,
    price: 600,
    priceUnit: PriceUnit.PER_MONTH,
    contactTelegram: 'madina_codes',
    latitude: 38.5412,
    longitude: 68.7491,
    createdDaysAgo: 12,
  },
  {
    id: 'seed-post-expiring',
    author: 'rustam',
    title: 'Studio flat, available now',
    description:
      'Small studio with a balcony. Good for one person. Ask me for photos.',
    category: Category.RENTALS,
    district: District.FIRDAVSI,
    price: 1800,
    priceUnit: PriceUnit.PER_MONTH,
    contactPhone: '+992903334455',
    createdDaysAgo: 28,
    expiresInDays: 2,
  },
  {
    id: 'seed-post-keys',
    author: 'aziza',
    title: 'Lost: keys with a blue keychain',
    description:
      'I lost my keys near the Sino bus stop on Monday evening. A reward for the person who finds them.',
    category: Category.LOST_FOUND,
    district: District.SINO,
    contactPhone: '+992904445566',
    createdDaysAgo: 1,
  },
  {
    id: 'seed-post-wallet',
    author: 'rustam',
    title: 'Found: black leather wallet',
    description:
      'I found a wallet near the Firdavsi market. Tell me what is inside and it is yours.',
    category: Category.LOST_FOUND,
    district: District.FIRDAVSI,
    contactTelegram: 'rustam_help',
    createdDaysAgo: 4,
  },
  {
    id: 'seed-post-phone',
    author: 'madina',
    title: 'Lost: grey phone in the library',
    description:
      'I left my phone on a table in the main library. Found it, thank you everyone!',
    category: Category.LOST_FOUND,
    district: District.UNIVERSITY_CAMPUS,
    status: PostStatus.RESOLVED,
    contactTelegram: 'madina_codes',
    createdDaysAgo: 6,
  },
  {
    id: 'seed-post-bike',
    author: 'aziza',
    title: 'Giving away a child bicycle',
    description:
      'Blue bicycle for a child of 6 to 8 years. Small repair needed on the brake. Free, come and take it.',
    category: Category.OTHER,
    district: District.SHOHMANSUR,
    contactTelegram: 'aziza_rent',
    createdDaysAgo: 7,
  },
  {
    id: 'seed-post-books',
    author: 'madina',
    title: 'Free engineering textbooks',
    description:
      'Textbooks for the first and second year of engineering. Russian and English. You pick them up.',
    category: Category.OTHER,
    district: District.UNIVERSITY_CAMPUS,
    contactTelegram: 'madina_codes',
    createdDaysAgo: 9,
  },
  {
    id: 'seed-post-event',
    author: 'rustam',
    title: 'Volunteers needed: park clean-up on Saturday',
    description:
      'We meet at 9:00 at the main entrance of the park. Gloves and bags are provided. Come with friends!',
    category: Category.OTHER,
    district: District.OTHER,
    contactPhone: '+992905556677',
    createdDaysAgo: 10,
  },
  {
    id: 'seed-post-expired',
    author: 'aziza',
    title: 'Piano lessons for children',
    description:
      'Lessons at my home, twice a week. This post has expired: renew it to show it again.',
    category: Category.TUTORING,
    district: District.ISMOILI_SOMONI,
    status: PostStatus.EXPIRED,
    price: 120,
    priceUnit: PriceUnit.PER_HOUR,
    contactPhone: '+992906667788',
    createdDaysAgo: 40,
    expiresInDays: -10,
  },
  {
    id: 'seed-post-removed',
    author: 'rustam',
    title: 'Click here to win a free phone',
    description:
      'This post was removed by an admin because it was spam. It must never appear in public lists.',
    category: Category.OTHER,
    district: District.OTHER,
    status: PostStatus.REMOVED,
    removedReason: 'Spam',
    contactTelegram: 'spam_account',
    createdDaysAgo: 3,
  },
];

const comments = [
  {
    id: 'seed-comment-1',
    post: 'seed-post-math',
    author: 'rustam',
    body: 'Do you also teach statistics?',
    daysAgo: 2,
  },
  {
    id: 'seed-comment-2',
    post: 'seed-post-math',
    author: 'aziza',
    body: 'Yes, I do. Write to me on Telegram.',
    daysAgo: 1,
  },
  {
    id: 'seed-comment-3',
    post: 'seed-post-room-campus',
    author: 'madina',
    body: 'Is the room still free?',
    daysAgo: 2,
  },
  {
    id: 'seed-comment-4',
    post: 'seed-post-flat',
    author: 'rustam',
    body: 'Can I see the flat tomorrow evening?',
    daysAgo: 5,
  },
  {
    id: 'seed-comment-5',
    post: 'seed-post-keys',
    author: 'madina',
    body: 'I will look near the bus stop today.',
    daysAgo: 1,
  },
  {
    id: 'seed-comment-6',
    post: 'seed-post-books',
    author: 'aziza',
    body: 'Are the second-year books still there?',
    daysAgo: 4,
  },
];

async function seedPosts() {
  const userIds = new Map(
    (await prisma.user.findMany({ select: { id: true, username: true } })).map(
      (u) => [u.username, u.id],
    ),
  );
  const idOf = (username: string) => {
    const id = userIds.get(username);
    if (!id) throw new Error(`Seed user not found: ${username}`);
    return id;
  };

  for (const { author, createdDaysAgo, expiresInDays, ...post } of posts) {
    const createdAt = daysAgo(createdDaysAgo);
    const data = {
      ...post,
      authorId: idOf(author),
      createdAt,
      expiresAt:
        expiresInDays !== undefined
          ? daysFromNow(expiresInDays)
          : new Date(createdAt.getTime() + 30 * DAY),
    };
    await prisma.post.upsert({
      where: { id: post.id },
      update: data,
      create: data,
    });
  }
  console.log(`Seeded ${posts.length} posts.`);

  for (const comment of comments) {
    const data = {
      body: comment.body,
      postId: comment.post,
      authorId: idOf(comment.author),
      createdAt: daysAgo(comment.daysAgo),
    };
    await prisma.comment.upsert({
      where: { id: comment.id },
      update: data,
      create: { id: comment.id, ...data },
    });
  }
  console.log(`Seeded ${comments.length} comments.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
