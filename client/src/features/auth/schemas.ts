import { z } from 'zod';

// Messages are translation keys (messages/*.json, section "validation"), never English text.
export type ValidationKey =
  'required' | 'email' | 'usernameFormat' | 'passwordLength' | 'passwordLetterDigit' | 'agree';

export const loginSchema = z.object({
  emailOrUsername: z.string().trim().min(1, 'required').max(254, 'required'),
  password: z.string().min(1, 'required').max(72, 'required'),
});

// The same rules as the backend (docs/02-SPEC.md section 8).
export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'required')
    .regex(/^[A-Za-z0-9_.]{3,20}$/, 'usernameFormat'),
  email: z.string().trim().min(1, 'required').max(254, 'email').pipe(z.email('email')),
  password: z
    .string()
    .min(1, 'required')
    .min(8, 'passwordLength')
    .max(72, 'passwordLength')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'passwordLetterDigit'),
  agree: z.boolean().refine((value) => value, { error: 'agree' }),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
