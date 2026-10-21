const GLYPHS = '#%&*+=/<>?0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
const randomGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

export function scrambleTo(write: (value: string) => void, text: string, ms = 320): () => void {
  let raf = 0;
  const start = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / ms);
    const cut = Math.floor(text.length * p);
    write([...text].map((ch, i) => (i < cut || ch === ' ' ? ch : randomGlyph())).join(''));
    if (p < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

export interface Decoder {
  start(options?: { delay?: number; duration?: number }): void;
  cancel(): void;
}

export function prepareDecode(root: HTMLElement, { skip = '' }: { skip?: string } = {}): Decoder {
  const reject = ['[data-no-scramble]', skip].filter(Boolean).join(', ');
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement?.closest(reject) || !n.textContent?.trim()
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  let offset = 0;
  const parts = nodes.map((node) => {
    const text = node.textContent ?? '';
    const wrap = document.createElement('span');
    const done = document.createTextNode('');
    const ghost = document.createElement('span');
    ghost.className = 'scramble-ghost';
    wrap.append(done, ghost);
    node.replaceWith(wrap);
    const part = { text, wrap, done, ghost, start: offset };
    offset += text.length;
    return part;
  });
  const total = offset;

  const render = (cut: number) => {
    for (const p of parts) {
      const local = Math.max(0, Math.min(p.text.length, cut - p.start));
      p.done.textContent = p.text.slice(0, local);
      p.ghost.textContent = [...p.text.slice(local)]
        .map((ch) => (/\s/.test(ch) ? ch : randomGlyph()))
        .join('');
    }
  };
  render(0);

  let started = false;
  let finished = false;
  let raf = 0;
  const restore = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    parts.forEach((p) => p.wrap.replaceWith(document.createTextNode(p.text)));
  };

  return {
    start({ delay = 0, duration = 900 } = {}) {
      if (started) return;
      started = true;
      const t0 = performance.now() + delay;
      const step = (now: number) => {
        if (finished) return;
        const p = Math.min(1, Math.max(0, (now - t0) / duration));
        render(Math.floor(total * p));
        if (p < 1) raf = requestAnimationFrame(step);
        else restore();
      };
      step(performance.now());
    },
    cancel: restore,
  };
}
