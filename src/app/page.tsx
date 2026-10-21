import { LatestPosts } from '@/features/blog';
import { Hero } from '@/features/hero';

export default function HomePage() {
  return (
    <main>
      <Hero />
      <LatestPosts />
    </main>
  );
}
