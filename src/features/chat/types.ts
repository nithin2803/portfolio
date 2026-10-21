import type { Brand, LinkIcon } from '@/lib/icons';

export type Segment =
  | { text: string }
  | { highlight: string; brand?: Brand; emoji?: string }
  | { link: string; href: string; icon: LinkIcon | null };

export type Paragraph = readonly Segment[];

export const RESERVED_IDS = [
  'about-me',
  'cant-answer',
  'slow-down',
  'out-of-tokens',
  'offline',
  'photo',
  'not-written',
] as const;
export type ReservedId = (typeof RESERVED_IDS)[number];
