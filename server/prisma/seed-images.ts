// Gives every demo post one picture. Run after the seed: npm run db:seed-images (in server/).
// The pictures are in prisma/seed-images (one per demo post). They are uploaded to Cloudinary like any
// photo a user adds, so the demo board looks like a real one. Posts that already have a picture are skipped,
// so it is safe to run many times.
import 'dotenv/config';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();
const DIR = join(__dirname, 'seed-images');

async function main() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.log(
      'Cloudinary keys are missing in server/.env: nothing uploaded.',
    );
    return;
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  let added = 0;
  for (const file of readdirSync(DIR).filter((name) => name.endsWith('.jpg'))) {
    const postId = file.replace(/\.jpg$/, '');
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, _count: { select: { images: true } } },
    });
    if (!post || post._count.images > 0) continue;

    const uploaded = await cloudinary.uploader.upload(join(DIR, file), {
      folder: 'community-board/posts',
      resource_type: 'image',
    });
    await prisma.postImage.create({
      data: {
        postId: post.id,
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        position: 0,
      },
    });
    added++;
    console.log(`+ ${postId}`);
  }
  console.log(`Done: ${added} picture(s) added.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
