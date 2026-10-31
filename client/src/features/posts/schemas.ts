import { z } from 'zod';
import { CATEGORIES, DISTRICTS, type CreatePostBody, type Post } from './api';

// Messages are translation keys (messages/*.json, section "validation"), never English text.
// The same rules as the backend (docs/02-SPEC.md section 8).
export const PRICE_UNITS = ['PER_MONTH', 'PER_HOUR', 'ONCE'] as const;
export const MAX_PRICE = 1_000_000;

/** Only these categories may have a price (the backend answers PRICE_NOT_ALLOWED otherwise). */
export const hasPrice = (category: Post['category']) =>
  category === 'TUTORING' || category === 'RENTALS';

export const postSchema = z
  .object({
    category: z.enum(CATEGORIES),
    title: z.string().trim().min(5, 'titleLength').max(120, 'titleLength'),
    description: z.string().trim().min(10, 'descriptionLength').max(5000, 'descriptionLength'),
    district: z.enum(DISTRICTS),
    price: z
      .string()
      .trim()
      .refine((value) => value === '' || /^\d{1,7}$/.test(value), 'priceInvalid')
      .refine((value) => value === '' || Number(value) <= MAX_PRICE, 'priceInvalid'),
    priceUnit: z.enum(PRICE_UNITS),
    contactTelegram: z
      .string()
      .trim()
      .transform((value) => value.replace(/^@/, ''))
      .refine((value) => value === '' || /^[A-Za-z0-9_]{5,32}$/.test(value), 'telegramFormat'),
    contactPhone: z
      .string()
      .trim()
      .transform((value) => value.replace(/[\s-]/g, ''))
      .refine((value) => value === '' || /^\+?[0-9]{7,15}$/.test(value), 'phoneFormat'),
  })
  .superRefine((values, ctx) => {
    if (!values.contactTelegram && !values.contactPhone) {
      ctx.addIssue({ code: 'custom', path: ['contactTelegram'], message: 'contactRequired' });
    }
  });

export type PostFormInput = z.input<typeof postSchema>;
export type PostFormValues = z.output<typeof postSchema>;

/** What the form sends to the backend: no price for categories that cannot have one. */
export function toBody(values: PostFormValues): CreatePostBody {
  const withPrice = hasPrice(values.category) && values.price !== '';
  return {
    category: values.category,
    title: values.title,
    description: values.description,
    district: values.district,
    price: withPrice ? Number(values.price) : null,
    priceUnit: withPrice ? values.priceUnit : null,
    contactTelegram: values.contactTelegram || null,
    contactPhone: values.contactPhone || null,
  };
}

/** The starting values of the edit form. */
export function fromPost(post: Post): PostFormInput {
  return {
    category: post.category,
    title: post.title,
    description: post.description,
    district: post.district,
    price: post.price === null ? '' : String(post.price),
    priceUnit: post.priceUnit ?? 'PER_MONTH',
    contactTelegram: post.contactTelegram ?? '',
    contactPhone: post.contactPhone ?? '',
  };
}
