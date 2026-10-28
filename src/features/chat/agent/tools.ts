import { getPosts, getPostText } from '@/features/blog';
import type { Knowledge } from '../knowledge';
import { CONTACT_LINKS } from '@/lib/site';
import type { ToolSpec } from './openrouter';

const NO_ARGS = { type: 'object', properties: {}, additionalProperties: false };

const TOOLS: ToolSpec[] = [
  {
    type: 'function',
    function: {
      name: 'list_blog_posts',
      description: "List Nithin's published blog posts with title, date, summary and link.",
      parameters: NO_ARGS,
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_blog_post',
      description: 'Read the text of one of Nithin’s blog posts by slug (from list_blog_posts).',
      parameters: {
        type: 'object',
        properties: { slug: { type: 'string', description: 'The post slug, e.g. "eval-infra".' } },
        required: ['slug'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_contact_links',
      description: 'Get the links people can use to reach Nithin (email, resume, GitHub, LinkedIn).',
      parameters: NO_ARGS,
    },
  },
];

// read_more only exists while me.md holds something back
export function toolsFor(k: Knowledge): ToolSpec[] {
  const more = k.me.facets.filter((f) => f.more).map((f) => f.id);
  if (!more.length) return TOOLS;
  return [
    ...TOOLS,
    {
      type: 'function',
      function: {
        name: 'read_more',
        description:
          'Read one of the "(more)" facts about Nithin, which you only see a teaser of, by its id.',
        parameters: {
          type: 'object',
          properties: { facet: { type: 'string', enum: more } },
          required: ['facet'],
          additionalProperties: false,
        },
      },
    },
  ];
}

export type ToolResult = { content: string; label: string; href?: string };

// the label shown over the answer while it reads one, like "Orbi notes"
export const moreLabel = (section: string) => `${section} notes`;

export async function runTool(k: Knowledge, name: string, rawArgs: string): Promise<ToolResult> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { content: JSON.stringify({ error: 'invalid arguments' }), label: name };
  }

  if (name === 'list_blog_posts') {
    const posts = await getPosts();
    return {
      label: 'blog index',
      href: '/blog',
      content: JSON.stringify(
        posts.map((p) => ({
          slug: p.slug,
          title: p.title,
          date: p.date,
          summary: p.summary,
          href: `/blog/${p.slug}`,
        })),
      ),
    };
  }
  if (name === 'read_blog_post') {
    const slug = typeof args.slug === 'string' ? args.slug.replace(/[^a-z0-9-]/gi, '') : '';
    const post = (await getPosts()).find((p) => p.slug === slug);
    const text = post && (await getPostText(slug));
    if (!post || !text) return { content: JSON.stringify({ error: 'no such post' }), label: 'blog post' };
    return {
      label: post.title,
      href: `/blog/${slug}`,
      content: JSON.stringify({ title: post.title, href: `/blog/${slug}`, text }),
    };
  }
  if (name === 'get_contact_links') {
    return {
      label: 'contact links',
      href: '/#contact',
      content: JSON.stringify(CONTACT_LINKS.map(({ label, href }) => ({ label, href }))),
    };
  }
  if (name === 'read_more') {
    const facet = k.me.facets.find((f) => f.more && f.id === args.facet);
    if (!facet) return { content: JSON.stringify({ error: 'no such fact' }), label: 'notes' };
    return { label: moreLabel(facet.section), content: JSON.stringify({ id: facet.id, text: facet.text }) };
  }
  return { content: JSON.stringify({ error: `unknown tool ${name}` }), label: name };
}
