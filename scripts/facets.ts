// bun run facets   how the chat sees content/chat/me.md: each section and its facets (one paragraph or bullet each).
//                  A follow-up is only offered for a facet not yet covered, in the section just answered, so this
//                  also shows where the chat will run out of things to suggest
import fs from 'node:fs';
import path from 'node:path';
import { parseFacets } from '@/features/chat/knowledge';

// a facet this long likely answers several questions, and covering any one of them uses up the rest
const LONG_FACET_CHARS = 450;
const PREVIEW_CHARS = 70;

const { facets } = parseFacets(fs.readFileSync(path.join(process.cwd(), 'content/chat/me.md'), 'utf8'));
const sections = Map.groupBy(facets, (f) => f.section);

for (const [section, list] of sections) {
  const thin = list.length === 1 ? '  ← one facet: no follow-ups once it is answered' : '';
  console.log(`\n${section} (${list.length})${thin}`);
  for (const f of list) {
    const long = f.text.length > LONG_FACET_CHARS ? `  ← ${f.text.length} chars: split it?` : '';
    const preview = f.text.length > PREVIEW_CHARS ? `${f.text.slice(0, PREVIEW_CHARS)}…` : f.text;
    console.log(`  ${f.id.padEnd(30)} ${f.more ? '(more) ' : ''}${preview}${long}`);
  }
}
console.log(`\n${facets.length} facets in ${sections.size} sections`);
