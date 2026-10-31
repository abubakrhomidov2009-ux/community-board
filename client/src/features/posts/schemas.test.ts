import { postSchema, toBody } from './schemas';

const valid = {
  category: 'RENTALS',
  title: 'Room for a student',
  description: 'A bright room, 10 minutes from campus.',
  district: 'UNIVERSITY_CAMPUS',
  price: '800',
  priceUnit: 'PER_MONTH',
  contactTelegram: '@firuza_n',
  contactPhone: '',
};

const issues = (input: object) =>
  postSchema.safeParse(input).error?.issues.map((i) => `${String(i.path[0])}:${i.message}`) ?? [];

describe('post form schema', () => {
  it('accepts a good rental and removes the @ from Telegram', () => {
    const result = postSchema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data?.contactTelegram).toBe('firuza_n');
  });

  it('asks for a title, details, price and contact in the same limits as the backend', () => {
    expect(issues({ ...valid, title: 'abc' })).toContain('title:titleLength');
    expect(issues({ ...valid, description: 'short' })).toContain('description:descriptionLength');
    expect(issues({ ...valid, price: '12.5' })).toContain('price:priceInvalid');
    expect(issues({ ...valid, price: '1000001' })).toContain('price:priceInvalid');
    expect(issues({ ...valid, contactTelegram: 'abc' })).toContain(
      'contactTelegram:telegramFormat',
    );
    expect(issues({ ...valid, contactTelegram: '', contactPhone: '123' })).toContain(
      'contactPhone:phoneFormat',
    );
  });

  it('needs Telegram or a phone number, and cleans spaces and dashes in the phone', () => {
    expect(issues({ ...valid, contactTelegram: '', contactPhone: '' })).toContain(
      'contactTelegram:contactRequired',
    );
    const phone = postSchema.safeParse({
      ...valid,
      contactTelegram: '',
      contactPhone: '+992 90-123 4567',
    });
    expect(phone.data?.contactPhone).toBe('+992901234567');
  });
});

describe('toBody', () => {
  it('sends the price and unit only for tutoring and rentals', () => {
    const rental = postSchema.parse(valid);
    expect(toBody(rental)).toMatchObject({ price: 800, priceUnit: 'PER_MONTH' });
    const lost = postSchema.parse({ ...valid, category: 'LOST_FOUND' });
    expect(toBody(lost)).toMatchObject({ price: null, priceUnit: null });
    const noPrice = postSchema.parse({ ...valid, price: '' });
    expect(toBody(noPrice)).toMatchObject({ price: null, priceUnit: null });
  });

  it('sends null for an empty phone', () => {
    expect(toBody(postSchema.parse(valid)).contactPhone).toBeNull();
  });
});
