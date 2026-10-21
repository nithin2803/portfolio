// The compiled content/icons.yaml (see scripts/glossary.ts). Regenerate with `bun run icons`.
import data from './glossary.generated.json';
import type { LinkIcon } from './icons';

// a name that renders with an icon: a logo (`icon`) or an emoji, optionally linked
export type Term = {
  id: string;
  names: string[];
  icon?: LinkIcon;
  emoji?: string;
  href?: string;
  // false: also an ordinary word, so only where marked [Name](@id), never matched in plain text (X, Go)
  auto?: false;
};

export type Glossary = {
  terms: Term[];
  // host or host/path prefixes (longest first) and the icon a link there gets
  links: { prefix: string; icon: LinkIcon }[];
};

export const glossary = data as Glossary;
