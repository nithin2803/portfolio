// bun run icons            content/icons.yaml -> src/lib/glossary.generated.json (offline)
// bun run icons --suggest  also has a model look over content/: it proposes icons for names that don't have one
//                          (appended to content/icons.yaml), and marks the mentions of ambiguous names (Go the
//                          language, not "Go Dawgs") as [Go](@go) in the content itself. Review both in the diff.
//                          Needs OPENROUTER_API_KEY; ICONS_MODEL picks the model.
import fs from 'node:fs';
import path from 'node:path';
import {
  contentHash,
  corpus,
  isEmoji,
  mentions,
  readIconsFile,
  slugify,
  thesvgExists,
  thesvgIndex,
  wordRe,
  writeGlossary,
  YAML_PATH,
  type Brand,
  type Doc,
  type TermDef,
} from './glossary';

const ROOT = process.cwd();
const MODEL = process.env.ICONS_MODEL ?? 'anthropic/claude-sonnet-5.5';
const CONTEXT_CHARS = 110;

async function askJson<T>(prompt: string): Promise<T> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('--suggest needs OPENROUTER_API_KEY (bun loads .env.local)');
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as { choices: { message: { content: string } }[] };
  const json = body.choices[0]?.message.content.match(/\[[\s\S]*\]/)?.[0];
  if (!json) throw new Error(`the model didn't return a JSON array:\n${body.choices[0]?.message.content}`);
  return JSON.parse(json) as T;
}

type Proposal = { term: string; kind: 'emoji' | 'brand' | 'map'; value: string; ambiguous?: boolean };

const proposeTerms = (text: string, known: string[], candidates: Brand[]) =>
  askJson<
    Proposal[]
  >(`You pick inline icons for names in a personal website's text. The first mention of each name you pick will render with a small icon after it.

Pick names a reader would picture, and give each one icon:
- brand: a company, product, framework, language, school or team with a real logo. value = a thesvg slug. Use a slug from the candidate list when the text means that brand; otherwise your best guess at a thesvg slug (e.g. "threedotjs", "youtube").
- map: a specific real place a reader might look up (a canyon, a trail, a park, a lake, a neighbourhood). value = a Google Maps search query that finds it, e.g. "Snow Lake Trail, Washington".
- emoji: countries (their flag), cities, activities, hobbies, animals, foods and objects. value = one emoji.

Be selective. Skip abstract concepts (distributed systems, RAG, evaluation), generic words, people's names, and anything already known. Skip a candidate brand when the text only uses the word in its ordinary sense (e.g. "go" the verb, "linear" the adjective). If a name is also an ordinary word and the text could use it either way (Go, Rust, Swift, X), still pick it when the text means the brand somewhere, and add "ambiguous": true. Use the name exactly as it appears in the text (same case), choosing the most specific phrase ("glacier hiking", not "hiking", if that's what the text says).

Already known (skip): ${known.join(', ')}

Candidate brands found in the text (name -> slug):
${candidates.map((c) => `${c.title} -> ${c.slug}`).join('\n') || '(none)'}

Reply with only a JSON array: [{"term": "...", "kind": "brand" | "map" | "emoji", "value": "...", "ambiguous": true?}]

TEXT:
${text}`);

type Mention = { doc: Doc; index: number; name: string; id: string; brand: string };

// which mentions of ambiguous names mean the brand, judged one sentence at a time
async function judgeMentions(list: Mention[]) {
  const context = ({ doc, index, name }: Mention) =>
    `${doc.raw.slice(Math.max(0, index - CONTEXT_CHARS), index)}⟦${name}⟧${doc.raw.slice(index + name.length, index + name.length + CONTEXT_CHARS)}`.replace(
      /\s+/g,
      ' ',
    );
  const yes = await askJson<
    number[]
  >(`Each line below quotes a personal website's text with one name in ⟦brackets⟧. The name is also an ordinary word. Decide for each whether the bracketed word, as used there, means the brand named after the arrow (so it should get that brand's logo), not the ordinary word.

${list.map((m, i) => `${i}. [${m.brand}] …${context(m)}…`).join('\n')}

Reply with only a JSON array of the line numbers that mean the brand, e.g. [0, 3]. Reply [] if none do.`);
  return new Set(yes);
}

// YAML in the same flow style as the hand-written entries
const quote = (s: string) =>
  /^[\p{L}\p{N}][\p{L}\p{N} .-]*$/u.test(s) && !/^(yes|no|true|false|null|on|off)$/i.test(s)
    ? s
    : JSON.stringify(s);
const yamlValue = (v: string | TermDef) =>
  typeof v === 'string'
    ? v
    : `{ ${Object.entries(v)
        .map(
          ([k, x]) =>
            `${k}: ${Array.isArray(x) ? `[${x.map(quote).join(', ')}]` : typeof x === 'string' ? quote(x) : x}`,
        )
        .join(', ')} }`;
// replaces a top-level key and its value, however many lines prettier spread it over
const setKey = (yaml: string, key: string, value: string) =>
  yaml.replace(new RegExp(`^${key}:.*(?:\\n[ \\t]+.*)*`, 'm'), `${key}: ${value}`);

async function suggest() {
  const file = readIconsFile();
  const docs = corpus();
  const text = docs.map((d) => `## ${d.file}\n${d.text.replace(/[ \t]+/g, ' ')}`).join('\n\n');
  const termNames = (d: string | TermDef, n: string) => [
    n,
    ...(typeof d === 'string' ? [] : (d.aliases ?? [])),
  ];
  const known = new Set([
    ...Object.entries(file.terms).flatMap(([n, d]) => termNames(d, n)),
    ...(file.ignore ?? []),
  ]);
  const skipped = { ...file.skipped };
  // a skipped name is asked about again once its number of plain mentions changes
  const count = (name: string) => mentions(name, docs).length;
  const settled = (name: string) => known.has(name) || skipped[name] === count(name);
  const index = thesvgIndex();
  const proposed: [string, string | TermDef][] = [];

  // 2. names: thesvg brands named in the text are candidates the model judges in context, and it adds the
  // long tail (flags, places, activities) no index can know
  const found = (n: string) => n.length > 1 && !settled(n) && text.includes(n) && wordRe(n).test(text);
  const candidates = index.filter((b) => b.names.some(found));
  console.log(`asking ${MODEL} for new names (${candidates.length} candidate brands)…`);
  const ambiguous: [string, string, string][] = []; // name, id, brand
  for (const p of await proposeTerms(text, [...known, ...Object.keys(skipped)], candidates)) {
    const why =
      !p.term || known.has(p.term)
        ? 'already known'
        : !wordRe(p.term).test(text)
          ? "isn't in the text"
          : p.kind === 'emoji' && !isEmoji(p.value)
            ? `"${p.value}" isn't one emoji`
            : p.kind === 'brand' && !thesvgExists(p.value)
              ? `no thesvg icon "${p.value}"`
              : p.kind === 'map' && !p.value?.trim()
                ? 'no place to search'
                : null;
    if (why) {
      console.log(`  passed on ${p.term}: ${why}`);
      continue;
    }
    const auto = p.kind === 'brand' && p.ambiguous ? { auto: false } : {};
    const def: string | TermDef =
      p.kind === 'emoji' ? p.value : p.kind === 'map' ? { map: p.value } : { brand: p.value, ...auto };
    proposed.push([p.term, def]);
    known.add(p.term);
    delete skipped[p.term];
    if (p.ambiguous && p.kind === 'brand') ambiguous.push([p.term, slugify(p.term), p.term]);
  }
  // candidates the model passed on are ordinary words here ("Sure", "Search")
  for (const c of candidates) for (const n of c.names) if (found(n) && !known.has(n)) skipped[n] = count(n);

  // 3. ambiguous names (auto: false): the model reads each plain mention and the ones that mean the brand get
  // marked in the content as [Go](@go); the rest are skipped until their count changes
  for (const [name, d] of Object.entries(file.terms))
    if (typeof d !== 'string' && d.auto === false)
      for (const n of termNames(d, name)) ambiguous.push([n, d.id ?? slugify(name), name]);
  const unsettled = ambiguous.filter(([n]) => skipped[n] !== count(n));
  const list: Mention[] = unsettled.flatMap(([name, id, brand]) =>
    mentions(name, docs).map((m) => ({ ...m, name, id, brand })),
  );
  let marked = 0;
  if (list.length) {
    console.log(`asking ${MODEL} about ${list.length} mentions of ${unsettled.map(([n]) => n).join(', ')}…`);
    const yes = await judgeMentions(list);
    const edits = new Map<Doc, Mention[]>();
    list.forEach((m, i) => yes.has(i) && edits.set(m.doc, [...(edits.get(m.doc) ?? []), m]));
    for (const [doc, ms] of edits) {
      let raw = doc.raw;
      // back to front, so earlier indexes stay put
      for (const m of ms.sort((a, b) => b.index - a.index))
        raw = `${raw.slice(0, m.index)}[${m.name}](@${m.id})${raw.slice(m.index + m.name.length)}`;
      fs.writeFileSync(path.join(ROOT, doc.file), raw);
      console.log(`  marked ${ms.map((m) => m.name).join(', ')} in ${doc.file}`);
      marked += ms.length;
    }
    for (const [name] of unsettled) {
      const left = list.filter((m, i) => m.name === name && !yes.has(i)).length;
      if (left) skipped[name] = left;
      else delete skipped[name];
    }
  }

  let yaml = fs.readFileSync(YAML_PATH, 'utf8');
  if (proposed.length) {
    const block = [
      `  # proposed by \`bun run icons --suggest\` on ${new Date().toISOString().slice(0, 10)}: keep, edit, or move to ignore`,
      ...proposed.map(([name, def]) => `  ${quote(name)}: ${yamlValue(def)}`),
    ].join('\n');
    // terms is followed by a comment block and then `favicons:`; new entries go at its end
    yaml = yaml.replace(/\n((?:#[^\n]*\n)*)favicons:/, (m, comments) => `\n${block}\n\n${comments}favicons:`);
  }
  const sorted = Object.entries(skipped).sort(([a], [b]) => a.localeCompare(b));
  yaml = setKey(yaml, 'skipped', `{ ${sorted.map(([n, c]) => `${quote(n)}: ${c}`).join(', ')} }`);
  yaml = setKey(yaml, 'suggested', contentHash());
  fs.writeFileSync(YAML_PATH, yaml);
  console.log(
    `proposed ${proposed.length} terms, marked ${marked} mentions, ${sorted.length} skipped: review the diff`,
  );
}

if (process.argv.includes('--suggest')) await suggest();
const g = await writeGlossary();
console.log(
  `wrote ${path.relative(ROOT, 'src/lib/glossary.generated.json')}: ${g.terms.length} terms, ${g.links.length} link icons`,
);
