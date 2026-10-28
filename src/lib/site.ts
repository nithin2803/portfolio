export const SITE = {
  name: 'Nithin Srinivasan, Software Engineer',
  title: 'Nithin Srinivasan, Software Engineer',
  author: 'Nithin',
  description: 'My personal portfolio, blog, and everything in between.',
  url: 'https://nithins.dev',
  location: 'Seattle',
  timeZone: 'America/Los_Angeles',
} as const;

// the chat's "play" action: not a page, it scrolls to the contact section and starts the bug game there
export const PLAY_GAME = { href: '/#play', event: 'site:play-game' } as const;

export const NAV_LINKS = [
  { label: 'About', href: '/#about' },
  { label: 'Blog', href: '/blog' },
  // on every page, so it scrolls to this page's own contact section
  { label: 'Contact', href: '#contact' },
] as const;

export const CONTACT_LINKS = [
  { label: 'Email', href: 'mailto:nithin2803@gmail.com', handle: 'nithin2803@gmail.com' },
  { label: 'Resume', href: '/resume.pdf', handle: 'resume.pdf' },
  { label: 'GitHub', href: 'https://github.com/nithin2803', handle: '@nithin2803' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/nithinsrinivasan', handle: 'in/nithinsrinivasan' },
] as const;
