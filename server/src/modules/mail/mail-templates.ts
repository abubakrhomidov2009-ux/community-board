import { Locale } from '@prisma/client';

export interface VerificationEmail {
  subject: string;
  html: string;
  text: string;
}

interface Copy {
  subject: string;
  greeting: (username: string) => string;
  intro: string;
  button: string;
  fallback: string;
  expires: string;
  ignore: string;
  spam: string;
}

// The email text exists in all 3 languages. The language comes from the user's preferredLocale.
const COPY: Record<Locale, Copy> = {
  [Locale.EN]: {
    subject: 'Confirm your university email - Community Board',
    greeting: (username) => `Hello, ${username}!`,
    intro:
      'Please confirm that this is your university email. After that your profile gets the "Student ✓" badge.',
    button: 'Confirm my email',
    fallback: 'If the button does not work, copy this link into your browser:',
    expires: 'The link works for 24 hours.',
    ignore: 'If you did not ask for this, you can ignore this email.',
    spam: 'Cannot find our emails? Check your spam folder.',
  },
  [Locale.RU]: {
    subject: 'Подтвердите университетскую почту - Community Board',
    greeting: (username) => `Здравствуйте, ${username}!`,
    intro:
      'Подтвердите, что это ваша университетская почта. После этого в вашем профиле появится значок «Студент ✓».',
    button: 'Подтвердить почту',
    fallback: 'Если кнопка не работает, скопируйте эту ссылку в браузер:',
    expires: 'Ссылка действует 24 часа.',
    ignore: 'Если вы этого не просили, просто проигнорируйте это письмо.',
    spam: 'Не нашли наши письма? Проверьте папку «Спам».',
  },
  [Locale.TG]: {
    subject: 'Почтаи донишгоҳии худро тасдиқ кунед - Community Board',
    greeting: (username) => `Салом, ${username}!`,
    intro:
      'Лутфан тасдиқ кунед, ки ин почтаи донишгоҳии шумост. Баъд аз ин дар профили шумо нишони «Донишҷӯ ✓» пайдо мешавад.',
    button: 'Почтаро тасдиқ кардан',
    fallback: 'Агар тугма кор накунад, ин пайвандро ба браузер нусха кунед:',
    expires: 'Пайванд 24 соат амал мекунад.',
    ignore: 'Агар шумо инро наметалабидед, ин мактубро нодида гиред.',
    spam: 'Мактубҳои моро наёфтед? Ҷузвдони «Спам»-ро санҷед.',
  },
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function buildVerificationEmail(
  locale: Locale,
  username: string,
  link: string,
): VerificationEmail {
  const copy = COPY[locale] ?? COPY[Locale.EN];
  const name = escapeHtml(username);
  const safeLink = escapeHtml(link);

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#fafaf9;font-family:Arial,Helvetica,sans-serif;color:#1c1917;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e3e5e1;border-radius:12px;padding:24px;">
      <h1 style="font-size:20px;margin:0 0 16px;">${copy.greeting(name)}</h1>
      <p style="font-size:16px;line-height:24px;margin:0 0 24px;">${copy.intro}</p>
      <p style="margin:0 0 24px;">
        <a href="${safeLink}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:16px;">${copy.button}</a>
      </p>
      <p style="font-size:14px;line-height:20px;color:#57534e;margin:0 0 8px;">${copy.fallback}</p>
      <p style="font-size:14px;line-height:20px;word-break:break-all;margin:0 0 24px;"><a href="${safeLink}" style="color:#0f766e;">${safeLink}</a></p>
      <p style="font-size:14px;line-height:20px;color:#57534e;margin:0 0 8px;">${copy.expires}</p>
      <p style="font-size:14px;line-height:20px;color:#57534e;margin:0 0 8px;">${copy.ignore}</p>
      <p style="font-size:14px;line-height:20px;color:#57534e;margin:0;">${copy.spam}</p>
    </div>
  </body>
</html>`;

  const text = [
    copy.greeting(username),
    '',
    copy.intro,
    '',
    link,
    '',
    copy.expires,
    copy.ignore,
    copy.spam,
  ].join('\n');

  return { subject: copy.subject, html, text };
}
