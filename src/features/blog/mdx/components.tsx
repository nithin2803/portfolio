import type { MDXComponents } from 'mdx/types';
import type { ComponentPropsWithoutRef } from 'react';
import { Anchor } from './Anchor';
import { Blockquote } from './Blockquote';
import { CodeBlock, InlineCode } from './Code';
import { Heading } from './Heading';
import { ListItem, OrderedList, UnorderedList } from './List';
import { MdxImage } from './MdxImage';
import { Paragraph } from './Paragraph';
import { Rule } from './Rule';
import { Term } from './Term';

type H = ComponentPropsWithoutRef<'h2'>;

export const mdxComponents = {
  h1: (p: H) => <Heading level={1} {...p} />,
  h2: (p: H) => <Heading level={2} {...p} />,
  h3: (p: H) => <Heading level={3} {...p} />,
  h4: (p: H) => <Heading level={4} {...p} />,
  p: Paragraph,
  a: Anchor,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
  blockquote: Blockquote,
  code: InlineCode,
  pre: CodeBlock,
  hr: Rule,
  img: MdxImage,
  Term,
  del: (p: ComponentPropsWithoutRef<'del'>) => <del className="text-fg-faint decoration-fg-faint" {...p} />,
  strong: (p: ComponentPropsWithoutRef<'strong'>) => <strong className="font-medium text-fg" {...p} />,
} satisfies MDXComponents;
