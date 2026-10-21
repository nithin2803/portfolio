export const BLOG_COPY = {
  title: 'Blog',
  intro: 'Notes on whatever I’m figuring out, mostly so I understand it better myself.',
  empty: 'Nothing here yet. The first post is on its way.',
  allPosts: 'All posts',
  rssLabel: 'RSS',
  readingTime: (minutes: number) => `${minutes} min read`,
  draft: 'Draft',
} as const;
