import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPost, getPosts, PostHeader, Prose } from '@/features/blog';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getPosts()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.summary,
    keywords: post.tags,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.summary,
      publishedTime: post.date,
      tags: post.tags,
      ...(post.cover && { images: [post.cover] }),
    },
  };
}

export default async function PostPage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const { Content } = post;
  return (
    <main className="mx-auto max-w-article px-edge pt-40 pb-32">
      <article className="flex flex-col gap-12">
        <PostHeader post={post} />
        <Prose>
          <Content />
        </Prose>
      </article>
    </main>
  );
}
