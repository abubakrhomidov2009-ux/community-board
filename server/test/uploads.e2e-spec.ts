import { CloudinaryService } from '../src/modules/uploads/cloudinary.service';
import {
  bodyOf,
  clientWithToken,
  createTestApp,
  createUser,
  guestClient,
  resetDatabase,
  TestContext,
  validPost,
} from './helpers';

interface Post {
  id: string;
  images: { id: string; url: string; position: number }[];
}

// The first bytes of real files (the server checks them, not only the file name).
const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
  Buffer.from('JFIF'),
  Buffer.alloc(50),
]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(50),
]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBP'),
  Buffer.alloc(50),
]);
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(50)]);

describe('Image uploads (e2e, real multipart handling, fake Cloudinary)', () => {
  let ctx: TestContext;
  let counter = 0;
  const cloudinary = {
    isConfigured: () => true,
    upload: jest.fn((_buffer: Buffer) => {
      counter += 1;
      return Promise.resolve({
        url: `https://res.cloudinary.com/test/image/upload/photo-${counter}.jpg`,
        publicId: `test/photo-${counter}`,
      });
    }),
    destroyMany: jest.fn((_ids: string[]) => Promise.resolve()),
  };

  beforeAll(async () => {
    ctx = await createTestApp((builder) =>
      builder.overrideProvider(CloudinaryService).useValue(cloudinary),
    );
  });

  beforeEach(async () => {
    counter = 0;
    cloudinary.upload.mockClear();
    cloudinary.destroyMany.mockClear();
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  async function setup() {
    const aziza = await createUser(ctx.prisma, { username: 'aziza' });
    const rustam = await createUser(ctx.prisma, { username: 'rustam' });
    const azizaClient = clientWithToken(ctx.app, aziza.id);
    const post = bodyOf<Post>(
      await azizaClient.post('/api/posts').send(validPost).expect(201),
    );
    return {
      azizaClient,
      rustamClient: clientWithToken(ctx.app, rustam.id),
      post,
    };
  }

  const attach = (
    client: ReturnType<typeof clientWithToken>,
    postId: string,
    files: { data: Buffer; name: string; type: string }[],
  ) => {
    let req = client.post(`/api/posts/${postId}/images`);
    for (const file of files)
      req = req.attach('files', file.data, {
        filename: file.name,
        contentType: file.type,
      });
    return req;
  };

  it('uploads jpg, png and webp; the post shows them in order; the first is the thumbnail', async () => {
    const { azizaClient, post } = await setup();
    const response = await attach(azizaClient, post.id, [
      { data: JPEG, name: 'a.jpg', type: 'image/jpeg' },
      { data: PNG, name: 'b.png', type: 'image/png' },
      { data: WEBP, name: 'c.webp', type: 'image/webp' },
    ]).expect(201);
    const images = bodyOf<Post['images']>(response);
    expect(images.map((i) => i.position)).toEqual([0, 1, 2]);
    expect(
      images.every((i) => i.url.startsWith('https://res.cloudinary.com/')),
    ).toBe(true);

    // more files continue the order
    const more = bodyOf<Post['images']>(
      await attach(azizaClient, post.id, [
        { data: JPEG, name: 'd.jpg', type: 'image/jpeg' },
      ]).expect(201),
    );
    expect(more[0].position).toBe(3);

    const detail = bodyOf<Post>(
      await azizaClient.get(`/api/posts/${post.id}`).expect(200),
    );
    expect(detail.images.map((i) => i.position)).toEqual([0, 1, 2, 3]);
    const list = bodyOf<{ items: Post[] }>(
      await azizaClient.get('/api/posts').expect(200),
    );
    expect(list.items[0].images[0].position).toBe(0);
  });

  it('refuses more than 5 images in total, and uploads nothing when it refuses', async () => {
    const { azizaClient, post } = await setup();
    const six = Array.from({ length: 6 }, (_, i) => ({
      data: JPEG,
      name: `${i}.jpg`,
      type: 'image/jpeg',
    }));
    const tooMany = await attach(azizaClient, post.id, six).expect(400);
    expect(bodyOf(tooMany)).toMatchObject({
      errorCode: 'IMAGE_LIMIT_EXCEEDED',
    });
    expect(cloudinary.upload).not.toHaveBeenCalled();

    await attach(azizaClient, post.id, six.slice(0, 5)).expect(201);
    const sixth = await attach(azizaClient, post.id, [
      { data: JPEG, name: 'x.jpg', type: 'image/jpeg' },
    ]).expect(400);
    expect(bodyOf(sixth)).toMatchObject({ errorCode: 'IMAGE_LIMIT_EXCEEDED' });
  });

  it('refuses wrong types, fake extensions and files over 5 MB', async () => {
    const { azizaClient, post } = await setup();

    const gif = await attach(azizaClient, post.id, [
      { data: GIF, name: 'a.gif', type: 'image/gif' },
    ]).expect(400);
    expect(bodyOf(gif)).toMatchObject({ errorCode: 'IMAGE_TYPE_INVALID' });

    // a text file pretending to be a jpg
    const fake = await attach(azizaClient, post.id, [
      {
        data: Buffer.from('<script>alert(1)</script>'),
        name: 'a.jpg',
        type: 'image/jpeg',
      },
    ]).expect(400);
    expect(bodyOf(fake)).toMatchObject({ errorCode: 'IMAGE_TYPE_INVALID' });

    // a png that says it is a jpeg
    await attach(azizaClient, post.id, [
      { data: PNG, name: 'a.jpg', type: 'image/jpeg' },
    ]).expect(400);

    // one bad file among good ones stops everything
    await attach(azizaClient, post.id, [
      { data: JPEG, name: 'ok.jpg', type: 'image/jpeg' },
      { data: GIF, name: 'bad.gif', type: 'image/gif' },
    ]).expect(400);

    const big = Buffer.concat([JPEG, Buffer.alloc(5 * 1024 * 1024 + 10)]);
    const tooBig = await attach(azizaClient, post.id, [
      { data: big, name: 'big.jpg', type: 'image/jpeg' },
    ]).expect(413);
    expect(bodyOf(tooBig)).toMatchObject({ errorCode: 'IMAGE_TOO_LARGE' });

    const justFits = Buffer.concat([
      JPEG,
      Buffer.alloc(5 * 1024 * 1024 - JPEG.length),
    ]);
    await attach(azizaClient, post.id, [
      { data: justFits, name: 'ok.jpg', type: 'image/jpeg' },
    ]).expect(201);

    // nothing was uploaded by the refused requests
    expect(cloudinary.upload).toHaveBeenCalledTimes(1);
    await azizaClient.post(`/api/posts/${post.id}/images`).expect(400); // no file at all
  });

  it('only the author can add or delete images; guests cannot', async () => {
    const { azizaClient, rustamClient, post } = await setup();
    const file = [{ data: JPEG, name: 'a.jpg', type: 'image/jpeg' }];
    await attach(guestClient(ctx.app) as never, post.id, file).expect(401);
    const notOwner = await attach(rustamClient, post.id, file).expect(403);
    expect(bodyOf(notOwner)).toMatchObject({ errorCode: 'POST_NOT_OWNER' });
    await attach(azizaClient, 'unknown-post', file).expect(404);

    const [image] = bodyOf<Post['images']>(
      await attach(azizaClient, post.id, file).expect(201),
    );
    await rustamClient
      .delete(`/api/posts/${post.id}/images/${image.id}`)
      .expect(403);
    await azizaClient
      .delete(`/api/posts/${post.id}/images/unknown`)
      .expect(404);
    await azizaClient
      .delete(`/api/posts/${post.id}/images/${image.id}`)
      .expect(204);
    expect(cloudinary.destroyMany).toHaveBeenCalledWith(['test/photo-1']);
    expect(
      bodyOf<Post>(await azizaClient.get(`/api/posts/${post.id}`).expect(200))
        .images,
    ).toEqual([]);
    await azizaClient
      .delete(`/api/posts/${post.id}/images/${image.id}`)
      .expect(404);
  });

  it('deleting a post also deletes its photos from Cloudinary', async () => {
    const { azizaClient, post } = await setup();
    await attach(azizaClient, post.id, [
      { data: JPEG, name: 'a.jpg', type: 'image/jpeg' },
      { data: PNG, name: 'b.png', type: 'image/png' },
    ]).expect(201);
    await azizaClient.delete(`/api/posts/${post.id}`).expect(204);
    expect(cloudinary.destroyMany).toHaveBeenCalledTimes(1);
    const deleted = cloudinary.destroyMany.mock.calls[0][0];
    expect([...deleted].sort()).toEqual(['test/photo-1', 'test/photo-2']);
    expect(await ctx.prisma.postImage.count()).toBe(0);
  });

  it('when Cloudinary fails: 502 UPLOAD_FAILED and the photos already sent are removed', async () => {
    const { azizaClient, post } = await setup();
    cloudinary.upload
      .mockResolvedValueOnce({
        url: 'https://res.cloudinary.com/test/ok.jpg',
        publicId: 'test/ok',
      })
      .mockRejectedValueOnce(new Error('Cloudinary is down'));
    const response = await attach(azizaClient, post.id, [
      { data: JPEG, name: 'a.jpg', type: 'image/jpeg' },
      { data: JPEG, name: 'b.jpg', type: 'image/jpeg' },
    ]).expect(502);
    expect(bodyOf(response)).toMatchObject({ errorCode: 'UPLOAD_FAILED' });
    expect(JSON.stringify(response.body)).not.toContain('Cloudinary is down');
    expect(cloudinary.destroyMany).toHaveBeenCalledWith(['test/ok']);
    expect(await ctx.prisma.postImage.count()).toBe(0);
  });
});
