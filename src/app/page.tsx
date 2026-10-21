import { About } from '@/features/about';
import { LatestPosts } from '@/features/blog';
import { Hero } from '@/features/hero';

export default function HomePage() {
  return (
    <main>
      <Hero />
      <About />
      <LatestPosts />
    </main>
  );
}
