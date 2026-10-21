import { SITE } from '@/lib/site';

export const HEADLINE = {
  greeting: "Hey! I'm",
  name: SITE.author,
  headshot: { src: '/assets/images/headshot.jpg', size: 128 },
  article: 'a',
  role: 'Software Engineer',
  based: 'based in',
  place: SITE.location,
  timeZone: SITE.timeZone,
} as const;

export const HEADLINE_DECODE = { delay: 900, duration: 1300 } as const;

export const HEADLINE_ID = 'headline';
