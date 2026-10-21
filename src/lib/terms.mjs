// Finds glossary names (content/icons.yaml) in plain text. Plain JS so the blog's remark plugin, which runs
// outside the bundler, can share it with the chat.

/** @typedef {{ id: string; names: readonly string[]; auto?: boolean }} TermNames */

const EDGE_BEFORE = '(?<![\\p{L}\\p{N}_@./-])';
const EDGE_AFTER = '(?![\\p{L}\\p{N}_]|[./-][\\p{L}\\p{N}])';
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** @type {WeakMap<readonly TermNames[], { regex: RegExp; byName: Map<string, string> }>} */
const compiled = new WeakMap();

/**
 * @param {readonly TermNames[]} terms
 */
function compile(terms) {
  let hit = compiled.get(terms);
  if (hit) return hit;
  const byName = new Map(terms.flatMap((t) => t.names.map((n) => /** @type {const} */ ([n, t.id]))));
  // longest first, so "glacier hiking" wins over "glacier"; `auto: false` terms (X, Go) only come from markup
  const names = terms
    .filter((t) => t.auto !== false)
    .flatMap((t) => t.names)
    .sort((a, b) => b.length - a.length)
    .map(escape);
  const regex = names.length
    ? new RegExp(`${EDGE_BEFORE}(?:${names.join('|')})${EDGE_AFTER}`, 'gu')
    : /(?!)/g;
  hit = { regex, byName };
  compiled.set(terms, hit);
  return hit;
}

/**
 * Splits `text` around glossary names. Only a term's first mention gets an `id` (`seen` carries that across
 * calls); later mentions stay plain text.
 * @param {string} text
 * @param {readonly TermNames[]} terms
 * @param {Set<string>} seen
 * @returns {({ text: string; id?: string })[]}
 */
export function annotate(text, terms, seen) {
  const { regex, byName } = compile(terms);
  /** @type {({ text: string; id?: string })[]} */
  const out = [];
  let at = 0;
  for (const m of text.matchAll(regex)) {
    const id = /** @type {string} */ (byName.get(m[0]));
    if (seen.has(id)) continue;
    seen.add(id);
    if (m.index > at) out.push({ text: text.slice(at, m.index) });
    out.push({ text: m[0], id });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

// `[Name](@id)` gives Name the icon of glossary term `id`: the one marker, in chat content, blog posts and the
// chat model's replies, for names that are also ordinary words (`auto: false`: Go, X). `[Name](@-)` keeps a
// mention plain. `bun run icons --suggest` writes these into content; the chat model writes its own.
export const NO_ICON = '-';

/**
 * The term id a marker href names (`NO_ICON` for none), or undefined for an ordinary link.
 * @param {string} href
 */
export const markerOf = (href) => (href.startsWith('@') ? href.slice(1) : undefined);

/**
 * The term a whole label names, if any (a link labelled "GitHub" counts as mentioning GitHub).
 * @param {string} label
 * @param {readonly TermNames[]} terms
 */
export function termFor(label, terms) {
  return compile(terms).byName.get(label.trim());
}
