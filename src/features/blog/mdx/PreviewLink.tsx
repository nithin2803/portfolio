'use client';

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react';
import { createPortal } from 'react-dom';
import { LinkIconView } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { LinkIcon } from '@/lib/icons';

// a blog link's hover preview: a screenshot of the linked page (or its title) in a card that follows the cursor,
// with the link's address under it
type Preview = { title: string | null; address: string; icon: LinkIcon | null };

const CARD_W = 320;
// the card's corner is its padding plus the screenshot's, so the two curves stay parallel
const PAD = 6;
const INNER_RADIUS = 6;
const OFFSET = 18;
const EASE = 0.22;

// one request per link per visit, shared by every hover
const previews = new Map<string, Promise<Preview | null>>();
function load(href: string) {
  let p = previews.get(href);
  if (!p) {
    p = fetch(`/api/preview?url=${encodeURIComponent(href)}`)
      .then((r) => (r.ok ? (r.json() as Promise<Preview>) : null))
      .catch(() => null);
    previews.set(href, p);
  }
  return p;
}

export function PreviewLink({ href = '', children, ...rest }: ComponentPropsWithoutRef<'a'>) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [hovering, setHovering] = useState(false);
  // the screenshot: loading, shown, or failed (then the card shows the page's title instead)
  const [image, setImage] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const card = useRef<HTMLDivElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const src = `/api/preview/image?url=${encodeURIComponent(href)}`;

  // a first screenshot takes seconds, so start it when the link scrolls into view, not on hover (mouse only)
  useEffect(() => {
    const el = link.current;
    if (!el || !matchMedia('(pointer: fine)').matches) return;
    const seen = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      seen.disconnect();
      void load(href);
      new Image().src = src;
    });
    seen.observe(el);
    return () => seen.disconnect();
  }, [href, src]);

  // the card trails the cursor, flipping to the other side near the window's edges
  useEffect(() => {
    if (!hovering || !preview) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const at = { ...target.current };
    let frame = 0;
    const tick = () => {
      const el = card.current;
      if (el) {
        const { x, y } = target.current;
        at.x += still ? x - at.x : (x - at.x) * EASE;
        at.y += still ? y - at.y : (y - at.y) * EASE;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const left = at.x + OFFSET + w > innerWidth ? at.x - OFFSET - w : at.x + OFFSET;
        const top = at.y + OFFSET + h > innerHeight ? at.y - OFFSET - h : at.y + OFFSET;
        el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [hovering, preview]);

  const show = hovering && preview && (image === 'loaded' || (image === 'failed' && preview.title));

  return (
    <>
      <a
        ref={link}
        href={href}
        {...rest}
        onPointerEnter={(e) => {
          if (e.pointerType !== 'mouse') return;
          target.current = { x: e.clientX, y: e.clientY };
          setHovering(true);
          void load(href).then(setPreview);
        }}
        onPointerMove={(e) => {
          target.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerLeave={() => setHovering(false)}
      >
        {children}
      </a>
      {hovering &&
        preview &&
        createPortal(
          <div
            ref={card}
            aria-hidden="true"
            style={{ width: CARD_W, padding: PAD, borderRadius: INNER_RADIUS + PAD }}
            className={cn(
              'pointer-events-none fixed top-0 left-0 z-50 flex flex-col border border-line bg-black shadow-bubble transition-opacity duration-150',
              show ? 'opacity-100' : 'opacity-0',
            )}
          >
            {image !== 'failed' ? (
              // eslint-disable-next-line @next/next/no-img-element -- already sized and cached by /api/preview/image
              <img
                src={src}
                alt=""
                onLoad={() => setImage('loaded')}
                onError={() => setImage('failed')}
                style={{ borderRadius: INNER_RADIUS }}
                className="block h-auto w-full"
              />
            ) : (
              <span style={{ borderRadius: INNER_RADIUS }} className="bg-white/[0.04] p-3 text-chat text-fg">
                {preview.title}
              </span>
            )}
            <span className="flex min-w-0 items-center gap-1.5 px-1 pt-2 pb-0.5 text-small text-fg-muted">
              {preview.icon && <LinkIconView icon={preview.icon} className="shrink-0" />}
              <span className="truncate">{preview.address}</span>
            </span>
          </div>,
          document.body,
        )}
    </>
  );
}
