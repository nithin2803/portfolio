import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// tailwind-merge must know the custom text sizes, or `text-display text-fg` drops one as a duplicate colour
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['small', 'body', 'display', 'hero', 'code'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
