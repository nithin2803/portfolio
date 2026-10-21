import { GlitchNMark, GlitchText, Keycap, PaperPlaneIcon, TextLink } from '@/components/ui';
import { iconFor } from '@/lib/brands';
import { CONTACT_LINKS } from '@/lib/site';
import { SHIP_ANCHOR_ID, SKYLINE_ANCHOR_ID } from './asteroids/anchor';
import { Asteroids } from './asteroids/Asteroids';
import { CONTACT } from './content';
import { CopyEmail } from './CopyEmail';
import { PixelSkyline } from './skyline/PixelSkyline';

const READABLE = '[text-shadow:0_0_18px_rgb(0_0_0/0.9),0_1px_3px_rgb(0_0_0/0.9)]';

export function Contact() {
  const email = CONTACT_LINKS.find((l) => l.href.startsWith('mailto:'))!;
  const links = CONTACT.links.map((label) => CONTACT_LINKS.find((l) => l.label === label)!);
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="relative h-svh min-h-[34rem] overflow-hidden"
    >
      <PixelSkyline
        id={SKYLINE_ANCHOR_ID}
        label={CONTACT.skylineAlt}
        className="absolute inset-y-0 left-0 h-full w-full md:w-[66%]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black via-black/75 to-transparent"
      />
      <div className="relative mx-auto flex h-full max-w-page items-end px-edge pb-[13vh]">
        <div className={READABLE}>
          <GlitchText as="h2" id="contact-heading" className="cursor-default text-display text-white">
            {CONTACT.heading}
          </GlitchText>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
            <TextLink
              href={email.href}
              aria-label={`${CONTACT.send}: ${email.handle}`}
              className="text-jumbo font-medium decoration-transparent"
            >
              {email.handle}
              {/* where the game's ship launches from and lands back into */}
              <PaperPlaneIcon
                id={SHIP_ANCHOR_ID}
                className="ml-[0.35em] size-[0.62em] align-[-0.04em] transition-[translate,opacity] duration-300 ease-spring group-hover/link:translate-x-[0.08em] group-hover/link:-translate-y-[0.08em] [[data-game]_&]:opacity-0"
              />
            </TextLink>
            <CopyEmail email={email.handle} />
          </div>
          <ul className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-2 text-body">
            {links.map((link) => (
              <li key={link.href}>
                <TextLink href={link.href} icon={iconFor(link.href)}>
                  {link.label}
                </TextLink>
              </li>
            ))}
          </ul>
          {/* the game needs a keyboard, so the hint only shows with a mouse and keyboard */}
          <p className="mt-6 hidden items-center gap-2 text-chat text-fg [@media(hover:hover)_and_(pointer:fine)]:flex">
            {CONTACT.hint.before} <Keycap>{CONTACT.hint.key}</Keycap> {CONTACT.hint.after}
          </p>
        </div>
      </div>
      <span className="absolute right-edge bottom-6 cursor-default">
        <GlitchNMark size={80} idle />
      </span>
      <Asteroids />
    </section>
  );
}
