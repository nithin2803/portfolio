import 'server-only';
import { SITE } from '@/lib/site';

const yearFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: SITE.timeZone });

export const BUILD_INFO = {
  year: yearFormat.format(new Date()),
} as const;
