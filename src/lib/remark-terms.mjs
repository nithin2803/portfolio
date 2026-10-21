// Remark plugin for blog posts: the first mention of each glossary name (content/icons.yaml) in a post becomes
// <Term id="…">name</Term>, which renders it with its icon. Loaded by path in next.config.ts, since Turbopack
// can't take plugin functions. Editing the glossary needs a dev-server restart to recompile posts.
import fs from 'node:fs';
import path from 'node:path';
import { annotate, markerOf, NO_ICON, termFor } from './terms.mjs';

// prose only: code, link text (a link shows its own icon), and MDX expressions and imports stay as written
const SKIP = new Set([
  'code',
  'inlineCode',
  'link',
  'linkReference',
  'mdxFlowExpression',
  'mdxTextExpression',
  'mdxjsEsm',
  'yaml',
]);

/** @param {any} node */
const textOf = (node) => (node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join(''));

/** @param {string} id @param {string} text */
const term = (id, text) => ({
  type: 'mdxJsxTextElement',
  name: 'Term',
  attributes: [{ type: 'mdxJsxAttribute', name: 'id', value: id }],
  children: [{ type: 'text', value: text }],
});

export default function remarkTerms() {
  const file = path.join(process.cwd(), 'src/lib/glossary.generated.json');
  /** @type {{ terms: import('./terms.mjs').TermNames[] }} */
  const { terms } = JSON.parse(fs.readFileSync(file, 'utf8'));
  const names = terms.map(({ id, names, auto }) => ({ id, names, auto }));

  const ids = new Set(names.map((t) => t.id));

  /** @param {any} tree @param {{ path?: string }} file */
  return (tree, file) => {
    const seen = new Set();
    /** @param {any} node */
    const walk = (node) => {
      if (!node.children) return;
      /** @type {any[]} */
      const out = [];
      for (const child of node.children) {
        if (child.type === 'heading') {
          // headings stay plain
          out.push(child);
        } else if (child.type === 'link' && markerOf(child.url) !== undefined) {
          // [Name](@id), the same marker the chat uses; a typo fails the build instead of shipping a broken link
          const id = /** @type {string} */ (markerOf(child.url));
          if (id !== NO_ICON && !ids.has(id))
            throw new Error(
              `${file.path ?? 'blog post'}: [${textOf(child)}](@${id}): no term "${id}" in content/icons.yaml`,
            );
          if (id === NO_ICON || seen.has(id)) out.push({ type: 'text', value: textOf(child) });
          else {
            seen.add(id);
            out.push(term(id, textOf(child)));
          }
        } else if (child.type === 'link') {
          const id = termFor(textOf(child), names);
          if (id) seen.add(id);
          out.push(child);
        } else if (SKIP.has(child.type)) {
          out.push(child);
        } else if (child.type === 'text') {
          for (const s of annotate(child.value, names, seen))
            out.push(s.id ? term(s.id, s.text) : { type: 'text', value: s.text });
        } else {
          walk(child);
          out.push(child);
        }
      }
      node.children = out;
    };
    walk(tree);
  };
}
