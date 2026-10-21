'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { AppLink, GlitchNMark, QUIET_LINK } from '@/components/ui';
import { cn } from '@/lib/cn';
import { NAV_LINKS } from '@/lib/site';

// a section is where you are while it crosses the middle of the screen
const MIDDLE_OF_SCREEN = '-50% 0px -50% 0px';

const sectionOf = (href: string) => href.split('#')[1];
const isPage = (href: string, pathname: string) =>
  !sectionOf(href) && (pathname === href || pathname.startsWith(`${href}/`));

// a link within this page scrolls here rather than going through Next.js, whose router skips the scroll
// when it thinks you're already at that URL (after you've scrolled away, or after the Contact link
// changed the hash without it)
function scrollWithinPage(e: MouseEvent<HTMLAnchorElement>) {
  const url = new URL(e.currentTarget.href);
  if (url.pathname !== location.pathname) return;
  e.preventDefault();
  if (url.href !== location.href) history.pushState(null, '', url.href);
  if (url.hash) document.getElementById(url.hash.slice(1))?.scrollIntoView();
  else scrollTo({ top: 0 });
}

// the id of the nav section in view on this page, if any
function useSectionInView(pathname: string) {
  const [inView, setInView] = useState<{ pathname: string; id: string | null }>({ pathname, id: null });

  useEffect(() => {
    const ids = NAV_LINKS.flatMap((l) => sectionOf(l.href) ?? []);
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        setInView({ pathname, id: ids.find((id) => visible.has(id)) ?? null });
      },
      { rootMargin: MIDDLE_OF_SCREEN },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [pathname]);

  // a section seen on the previous page doesn't count here
  return inView.pathname === pathname ? inView.id : null;
}

export function Nav() {
  const pathname = usePathname();
  const section = useSectionInView(pathname);
  const [hovered, setHovered] = useState<number | null>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const markRef = useRef<HTMLSpanElement>(null);

  // where you are: the section on screen, or else the page
  const current = NAV_LINKS.findIndex((l) =>
    section ? sectionOf(l.href) === section : isPage(l.href, pathname),
  );
  const marked = hovered ?? (current >= 0 ? current : null);

  // the highlight rests on where you are and slides to whatever is hovered
  useEffect(() => {
    const mark = markRef.current;
    if (!mark) return;
    const place = () => {
      const link = marked === null ? null : linkRefs.current[marked];
      mark.style.opacity = link ? '1' : '0';
      if (!link) return;
      mark.style.transform = `translateX(${link.offsetLeft}px)`;
      mark.style.width = `${link.offsetWidth}px`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(mark.parentElement!);
    return () => ro.disconnect();
  }, [marked]);

  return (
    <nav
      aria-label="Primary"
      className="bracket-frame fixed top-[22px] left-1/2 z-50 flex h-nav -translate-x-1/2 items-center gap-1 pr-2 pl-3 text-small uppercase glass-panel"
    >
      <Link href="/" aria-label="Home" className="group grid size-[34px] place-items-center outline-none">
        <GlitchNMark
          size={22}
          className="opacity-70 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </Link>
      <span aria-hidden="true" className="mr-1.5 ml-2 h-[22px] w-px bg-line" />
      <div className="relative">
        <span
          ref={markRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 h-[34px] bg-fg/6 opacity-0 shadow-[inset_0_-1px_0_var(--color-line-strong)] transition-[transform,width,opacity] duration-300 ease-out-quint"
        />
        <ul className="flex" onPointerLeave={() => setHovered(null)}>
          {NAV_LINKS.map((link, i) => (
            <li key={link.href}>
              <AppLink
                ref={(el) => void (linkRefs.current[i] = el)}
                href={link.href}
                aria-current={
                  isPage(link.href, pathname)
                    ? 'page'
                    : sectionOf(link.href) === section
                      ? 'location'
                      : undefined
                }
                onClick={scrollWithinPage}
                onPointerEnter={() => setHovered(i)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                className={cn(
                  'relative block px-3.5 leading-[34px] tabular-nums',
                  QUIET_LINK,
                  i === current && 'text-white',
                )}
              >
                {link.label}
              </AppLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
