import slugify from 'slugify';
import * as crypto from 'crypto';

export function generateSlug(text: string): string {
  const base = slugify(text, {
    lower: true,
    strict: true,
    trim: true,
  });
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
}
