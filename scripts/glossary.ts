// Compiles content/icons.yaml into src/lib/glossary.generated.json, the only form the site reads (so the
// build never parses YAML or touches thesvg's 7,600 modules). Run with `bun run icons`.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Glossary, Term } from '@/lib/glossary';
import type { LinkIcon } from '@/lib/icons';
import { DARK_IMAGE, imageLuminance, luminance } from '@/lib/luminance';

const ROOT = process.cwd();
export const YAML_PATH = path.join(ROOT, 'content/icons.yaml');
export const JSON_PATH = path.join(ROOT, 'src/lib/glossary.generated.json');
export const LOGOS = path.join(ROOT, 'public/assets/logos');
const THESVG = path.join(ROOT, 'node_modules/@thesvg/icons/dist');
const LOGO_HEIGHT = 128;

export type TermDef = {
  id?: string;
  brand?: string;
  variant?: string;
  color?: boolean;
  // a one-colour logo in the text colour instead of its brand colour
  mono?: boolean;
  image?: string;
  width?: number;
  height?: number;
  map?: string;
  favicon?: string;
  // links to these sites (host, or host/path) show this term's icon instead of their favicon
  sites?: string[];
  emoji?: string;
  nmark?: boolean;
  href?: string;
  aliases?: string[];
  auto?: boolean;
};

export type IconsFile = {
  suggested?: string;
  terms: Record<string, string | TermDef>;
  // link prefix (host, or host/path) -> the site whose favicon its links show instead of their own
  favicons?: Record<string, string>;
  ignore?: string[];
  skipped?: Record<string, number>;
};

const EMOJI = /^\p{Extended_Pictographic}|^\p{Regional_Indicator}{2}$/u;
const segmenter = new Intl.Segmenter();
export const isEmoji = (s: string) => [...segmenter.segment(s)].length === 1 && EMOJI.test(s);

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const mapsUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export function readIconsFile(): IconsFile {
  const data = Bun.YAML.parse(fs.readFileSync(YAML_PATH, 'utf8')) as IconsFile;
  if (!data?.terms || typeof data.terms !== 'object')
    throw new Error('content/icons.yaml: `terms` is missing');
  return data;
}

export const thesvgExists = (slug: string) => fs.existsSync(path.join(THESVG, `${slug}.js`));

async function thesvg(name: string, slug: string, variant?: string) {
  if (!thesvgExists(slug)) throw new Error(`content/icons.yaml: ${name}: no thesvg icon "${slug}"`);
  const mod = (await import(`@thesvg/icons/${slug}`)) as { svg: string; variants?: Record<string, string> };
  if (!variant) return mod.svg;
  const svg = mod.variants?.[variant];
  if (!svg) throw new Error(`content/icons.yaml: ${name}: "${slug}" has no "${variant}" variant`);
  return svg;
}

// PNG and WebP (VP8/VP8L/VP8X) headers carry the image size
export function imageSize(file: string): { width: number; height: number } {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 1, 4) === 'PNG') return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.toString('ascii', 0, 4) === 'RIFF') {
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    if (kind === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (kind === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  throw new Error(`${file}: can't read the image size (use PNG or WebP)`);
}

// on the dark page anything this dark (relative luminance, 0-1) is hard to see, so it's flipped to light
const DARK = 0.04;
const LIGHT = 0.9;

const NAMED: Record<string, string> = { black: '#000000', white: '#ffffff', red: '#ff0000' };
function hexColor(c: string): string | null {
  const named = NAMED[c.toLowerCase()];
  if (named) return named;
  const m = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})(?:[0-9a-f]{2})?$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join('') : m[1];
  return `#${h.toLowerCase()}`;
}
const hexLuminance = (hex: string) =>
  luminance(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));

// a logo with one colour is drawn as a stencil in that colour (or the text colour, when it's white, black, or
// too dark for the page); one with several keeps its own colours, since a stencil would flatten it into a blob
function svgIcon(svg: string, keepColors?: boolean, mono?: boolean): LinkIcon {
  if (keepColors) return { kind: 'svg', svg, color: true };
  if (mono) return { kind: 'svg', svg };
  const found = [...svg.matchAll(/(?:fill|stroke|stop-color)\s*(?:=\s*"|:\s*)([^";)]+)/g)].map((m) =>
    m[1].trim(),
  );
  if (found.some((c) => c.startsWith('url('))) return { kind: 'svg', svg, color: true };
  const colors = new Set(found.flatMap((c) => hexColor(c) ?? []));
  if (colors.size > 1) return { kind: 'svg', svg, color: true };
  const [only] = colors;
  const tinted = only && hexLuminance(only) >= DARK && hexLuminance(only) < LIGHT;
  return tinted ? { kind: 'svg', svg, tint: only } : { kind: 'svg', svg };
}

async function image(name: string, file: string, width?: number, height?: number): Promise<LinkIcon> {
  const full = path.join(LOGOS, file);
  if (!fs.existsSync(full))
    throw new Error(`content/icons.yaml: ${name}: public/assets/logos/${file} doesn't exist`);
  const size = width && height ? { width, height } : imageSize(full);
  // logos are scaled to 128px tall, so a width alone is enough for them
  return {
    kind: 'image',
    src: `/assets/logos/${file}`,
    ...(width && !height ? { width, height: LOGO_HEIGHT } : size),
    ...((await imageLuminance(full)) < DARK_IMAGE && { invert: true }),
  };
}

async function resolveTerm(name: string, raw: string | TermDef): Promise<{ term: Term; sites: string[] }> {
  const def: TermDef = typeof raw === 'string' ? { emoji: raw } : raw;
  const fail = (why: string): never => {
    throw new Error(`content/icons.yaml: ${name}: ${why}`);
  };
  const kinds = (['brand', 'image', 'map', 'favicon', 'emoji', 'nmark'] as const).filter(
    (k) => def[k] !== undefined,
  );
  if (kinds.length !== 1)
    fail(
      `needs exactly one of brand, image, map, favicon, emoji or nmark (has ${kinds.join(', ') || 'none'})`,
    );

  const term: Term = { id: def.id ?? slugify(name), names: [name, ...(def.aliases ?? [])] };
  if (def.auto === false) term.auto = false;
  if ('domains' in def) fail('`domains` is now `sites`');
  if (def.emoji !== undefined) {
    if (!isEmoji(def.emoji)) fail(`"${def.emoji}" isn't a single emoji`);
    term.emoji = def.emoji;
  } else if (def.nmark) {
    term.icon = { kind: 'site' };
  } else if (def.brand) {
    term.icon = svgIcon(await thesvg(name, def.brand, def.variant), def.color, def.mono);
  } else if (def.image) {
    term.icon = await image(name, def.image, def.width, def.height);
  } else if (def.map !== undefined) {
    if (!def.map.trim()) fail('`map` needs a place to search for');
    term.icon = svgIcon(await thesvg(name, 'google-maps'));
    term.href = mapsUrl(def.map);
  } else if (def.favicon) {
    term.icon = { kind: 'favicon', site: def.favicon };
  }
  if (def.href) term.href = def.href;
  if (def.sites?.length && !term.icon) fail('`sites` needs a logo, not an emoji');
  return { term, sites: def.sites ?? [] };
}

export type Brand = { slug: string; title: string; names: string[]; host: string | null };

const blank = (s: string) => s.replace(/[^\n]/g, ' ');
const NOT_PROSE = [
  /```[\s\S]*?```/g,
  /`[^`\n]*`/g,
  /export const meta[\s\S]*?\n\};?/g,
  /^(?:import|export) .*$/gm,
  /<[^>\n]+>/g,
  // links and [Name](@id) markers: a link shows its own icon, a marker is already decided
  /\[[^\]\n]*\]\([^)\s]*\)/g,
];

// the prose a reader sees, with everything else (frontmatter but notes, code, links, markers, JSX)
// blanked out to spaces, so a match's index is its index in the file
export function prose(raw: string) {
  let text = raw.replace(/^---\n[\s\S]*?\n---\n/, (front) =>
    front
      .split('\n')
      .map((line) => (/^notes:/.test(line) ? line : blank(line)))
      .join('\n'),
  );
  for (const re of NOT_PROSE) text = text.replace(re, blank);
  return text;
}

export type Doc = { file: string; raw: string; text: string };

// chat answers and blog posts
export function corpus(): Doc[] {
  return ['content/chat', 'content/blog'].flatMap((dir) =>
    fs
      .readdirSync(path.join(ROOT, dir))
      .filter((f) => /\.mdx?$/.test(f) && f !== 'README.md' && !f.startsWith('_'))
      .map((f) => {
        const raw = fs.readFileSync(path.join(ROOT, dir, f), 'utf8');
        return { file: `${dir}/${f}`, raw, text: prose(raw) };
      }),
  );
}

// every thesvg brand's names and website, read straight from the module headers
export function thesvgIndex(): Brand[] {
  const field = (src: string, key: string) =>
    src.match(new RegExp(`^export const ${key} = (.*);$`, 'm'))?.[1];
  return fs
    .readdirSync(THESVG)
    .filter((f) => f.endsWith('.js') && f !== 'index.js')
    .flatMap((f) => {
      // the svg comes before `url`, so the whole module has to be read
      const head = fs.readFileSync(path.join(THESVG, f), 'utf8');
      try {
        const title = JSON.parse(field(head, 'title') ?? 'null') as string | null;
        if (!title) return [];
        const aliases = JSON.parse(field(head, 'aliases') ?? '[]') as string[];
        const url = JSON.parse(field(head, 'url') ?? 'null') as string | null;
        let host: string | null = null;
        try {
          host = url ? new URL(url).host.replace(/^www\./, '') : null;
        } catch {}
        return [{ slug: f.slice(0, -3), title, names: [title, ...aliases], host }];
      } catch {
        return [];
      }
    });
}

export const wordRe = (name: string, flags = 'u') =>
  new RegExp(
    `(?<![\\p{L}\\p{N}_@./-])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`,
    flags,
  );

// every plain (unlinked, unmarked) mention of a name, by file and index
export const mentions = (name: string, docs: readonly Doc[]) =>
  docs.flatMap((doc) => [...doc.text.matchAll(wordRe(name, 'gu'))].map((m) => ({ doc, index: m.index })));

export function contentHash() {
  const files = ['content/chat', 'content/blog'].flatMap((dir) =>
    fs
      .readdirSync(path.join(ROOT, dir))
      .filter((f) => /\.mdx?$/.test(f) && f !== 'README.md')
      .sort()
      .map((f) => path.join(ROOT, dir, f)),
  );
  const hash = createHash('sha256');
  for (const f of files) hash.update(fs.readFileSync(f));
  return hash.digest('hex').slice(0, 16);
}

export async function buildGlossary(file = readIconsFile()): Promise<Glossary> {
  const terms: Term[] = [];
  const links: Glossary['links'] = [];
  const ids = new Map<string, string>();
  const names = new Map<string, string>();
  for (const [name, raw] of Object.entries(file.terms)) {
    const { term, sites } = await resolveTerm(name, raw);
    const clash = ids.get(term.id);
    if (clash) throw new Error(`content/icons.yaml: ${name} and ${clash} both have the id "${term.id}"`);
    ids.set(term.id, name);
    for (const n of term.names) {
      if (names.has(n))
        throw new Error(`content/icons.yaml: "${n}" is a name of both ${names.get(n)} and ${name}`);
      names.set(n, name);
    }
    terms.push(term);
    // a link to a site with a logo here shows that logo, so GitHub looks the same as a name and as a link
    for (const prefix of sites) links.push({ prefix, icon: term.icon! });
  }
  // every other link shows its site's favicon (src/lib/brands.ts); these borrow another site's
  for (const [prefix, site] of Object.entries(file.favicons ?? {}))
    links.push({ prefix, icon: { kind: 'favicon', site } });
  // longest first, so alexa.amazon.com is Alexa, not Amazon
  links.sort((a, b) => b.prefix.length - a.prefix.length);
  return { terms, links };
}

export const serialize = (g: Glossary) => `${JSON.stringify(g, null, 2)}\n`;

export async function writeGlossary() {
  const g = await buildGlossary();
  fs.writeFileSync(JSON_PATH, serialize(g));
  return g;
}
