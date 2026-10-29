import { loginSchema, registerSchema } from './schemas';

const valid = {
  username: 'aziza_1',
  email: 'aziza@example.com',
  password: 'Demo12345',
  agree: true,
};

const firstIssue = (result: {
  success: boolean;
  error?: { issues: { message: string; path: PropertyKey[] }[] };
}) => result.error?.issues.map((issue) => `${String(issue.path[0])}:${issue.message}`);

describe('loginSchema', () => {
  it('accepts an email or a username with a password', () => {
    expect(loginSchema.safeParse({ emailOrUsername: 'aziza', password: 'x' }).success).toBe(true);
    expect(
      loginSchema.safeParse({ emailOrUsername: ' aziza@example.com ', password: 'x' }).success,
    ).toBe(true);
  });

  it('asks for both fields (the message is a translation key)', () => {
    expect(firstIssue(loginSchema.safeParse({ emailOrUsername: '  ', password: '' }))).toEqual([
      'emailOrUsername:required',
      'password:required',
    ]);
  });
});

describe('registerSchema', () => {
  it('accepts valid values', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
    expect(registerSchema.safeParse({ ...valid, username: 'Aziza.H' }).success).toBe(true);
  });

  it.each([
    ['ab', 'usernameFormat'],
    ['has space', 'usernameFormat'],
    ['x'.repeat(21), 'usernameFormat'],
    ['bad-name!', 'usernameFormat'],
    ['', 'required'],
  ])('refuses username %j with %s', (username, key) => {
    expect(firstIssue(registerSchema.safeParse({ ...valid, username }))).toContain(
      `username:${key}`,
    );
  });

  it('refuses a bad email', () => {
    expect(firstIssue(registerSchema.safeParse({ ...valid, email: 'not-an-email' }))).toContain(
      'email:email',
    );
    expect(firstIssue(registerSchema.safeParse({ ...valid, email: '' }))).toContain(
      'email:required',
    );
  });

  it.each([
    ['short1', 'passwordLength'],
    ['onlyletters', 'passwordLetterDigit'],
    ['12345678', 'passwordLetterDigit'],
    ['', 'required'],
  ])('refuses password %j with %s', (password, key) => {
    expect(firstIssue(registerSchema.safeParse({ ...valid, password }))).toContain(
      `password:${key}`,
    );
  });

  it('needs the box about the posting rules', () => {
    expect(firstIssue(registerSchema.safeParse({ ...valid, agree: false }))).toContain(
      'agree:agree',
    );
  });
});
