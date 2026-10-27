import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Locale } from '@prisma/client';
import { AppException } from '../../common/app.exception';
import { ErrorCode } from '../../common/error-code';
import {
  getUniversityDomains,
  isUniversityEmail,
} from '../../config/university-domains';
import { buildVerificationEmail } from './mail-templates';
import { MailService } from './mail.service';

const input = {
  to: 'madina@students.university.tj',
  username: 'madina',
  locale: Locale.RU,
  link: 'https://site.example/ru/settings/verify-email?token=abc',
};

describe('MailService', () => {
  let service: MailService;
  const settings: Record<string, string | undefined> = {};
  const fetchMock = jest.fn();
  const realFetch = global.fetch;

  beforeEach(async () => {
    jest.resetAllMocks();
    for (const key of Object.keys(settings)) delete settings[key];
    settings.BREVO_API_KEY = 'xkeysib-test';
    settings.MAIL_FROM_EMAIL = 'sender@gmail.com';
    settings.MAIL_FROM_NAME = 'Community Board';
    global.fetch = fetchMock;
    const moduleRef = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => settings[key] },
        },
      ],
    }).compile();
    service = moduleRef.get(MailService);
  });

  afterAll(() => {
    global.fetch = realFetch;
  });

  async function expectMailFailed(promise: Promise<unknown>) {
    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).errorCode).toBe(ErrorCode.MAIL_SEND_FAILED);
    expect((error as AppException).getStatus()).toBe(HttpStatus.BAD_GATEWAY);
  }

  it('calls the Brevo API with the key, the sender, the recipient and the translated content', async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await service.sendVerificationEmail(input);

    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body: string },
    ];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(options.method).toBe('POST');
    expect(options.headers['api-key']).toBe('xkeysib-test');
    const body = JSON.parse(options.body) as {
      sender: { name: string; email: string };
      to: { email: string }[];
      subject: string;
      htmlContent: string;
    };
    expect(body.sender).toEqual({
      name: 'Community Board',
      email: 'sender@gmail.com',
    });
    expect(body.to).toEqual([{ email: input.to }]);
    expect(body.subject).toContain('Подтвердите');
    expect(body.htmlContent).toContain(input.link);
  });

  it('throws MAIL_SEND_FAILED when Brevo refuses (wrong key, sender not verified...)', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('{"message":"Key not found"}'),
    });
    await expectMailFailed(service.sendVerificationEmail(input));
  });

  it('throws MAIL_SEND_FAILED when Brevo cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    await expectMailFailed(service.sendVerificationEmail(input));
  });

  it('throws MAIL_SEND_FAILED without calling Brevo when the key is missing', async () => {
    settings.BREVO_API_KEY = undefined;
    await expectMailFailed(service.sendVerificationEmail(input));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('buildVerificationEmail', () => {
  const link = 'https://site.example/en/settings/verify-email?token=abc';

  it.each([
    [Locale.EN, 'Confirm my email', 'Hello, madina!'],
    [Locale.RU, 'Подтвердить почту', 'Здравствуйте, madina!'],
    [Locale.TG, 'Почтаро тасдиқ кардан', 'Салом, madina!'],
  ])(
    'has a full %s version with the link, the button and a spam hint',
    (locale, button, greeting) => {
      const email = buildVerificationEmail(locale, 'madina', link);
      expect(email.html).toContain(button);
      expect(email.html).toContain(greeting);
      expect(email.html).toContain(link);
      expect(email.text).toContain(link);
      expect(email.subject).toContain('Community Board');
    },
  );

  it('writes the three languages differently', () => {
    const subjects = [Locale.EN, Locale.RU, Locale.TG].map(
      (locale) => buildVerificationEmail(locale, 'a', link).subject,
    );
    expect(new Set(subjects).size).toBe(3);
  });

  it('escapes the user name so it cannot inject HTML', () => {
    const email = buildVerificationEmail(
      Locale.EN,
      '<script>alert(1)</script>',
      link,
    );
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });
});

describe('university domains', () => {
  const domains = ['university.tj', 'students.university.tj'];

  it('accepts the allowed domains and their subdomains, in any letter case', () => {
    expect(isUniversityEmail('a@university.tj', domains)).toBe(true);
    expect(isUniversityEmail('a@Students.University.TJ', domains)).toBe(true);
    expect(isUniversityEmail('a@cs.university.tj', domains)).toBe(true);
  });

  it('refuses other domains, look-alikes and broken emails', () => {
    expect(isUniversityEmail('a@gmail.com', domains)).toBe(false);
    expect(isUniversityEmail('a@evil-university.tj', domains)).toBe(false);
    expect(isUniversityEmail('a@university.tj.evil.com', domains)).toBe(false);
    expect(isUniversityEmail('no-at-sign', domains)).toBe(false);
  });

  it('reads ALLOWED_UNIVERSITY_DOMAINS, and falls back to the placeholder list', () => {
    expect(getUniversityDomains('tgu.tj, @TTU.tj')).toEqual([
      'tgu.tj',
      'ttu.tj',
    ]);
    expect(getUniversityDomains('')).toEqual(domains);
    expect(getUniversityDomains(undefined)).toEqual(domains);
  });
});
