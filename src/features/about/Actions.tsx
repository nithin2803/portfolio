import { AppLink, LinkIconView } from '@/components/ui';
import type { Action } from '@/features/chat/knowledge';
import type { LinkCatalog } from '@/features/chat/markdown';
import { cn } from '@/lib/cn';
import { PLAY_GAME } from '@/lib/site';

const CHIP =
  'group/action inline-flex items-center gap-1.5 border border-fringe-b/30 bg-fringe-b/5 px-2.5 py-1 text-small text-fg-muted transition-colors hover:border-fringe-b/60 hover:bg-fringe-b/10 hover:text-white';
const ICON =
  'transition-transform duration-300 ease-pop group-hover/action:-translate-y-[2px] group-hover/action:-rotate-8';

export function Actions({ actions, links }: { actions: readonly Action[]; links: LinkCatalog }) {
  // only allowlisted hrefs, like inline links
  const shown = actions.filter((a) => a.href in links.hrefs);
  if (!shown.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {shown.map(({ label, href }) => {
        const icon = links.hrefs[href];
        const body = (
          <>
            {icon && <LinkIconView icon={icon} className={ICON} />}
            {label}
          </>
        );
        // the game needs a keyboard, so touch screens don't get the button
        if (href === PLAY_GAME.href) {
          return (
            <button
              key={href}
              type="button"
              onClick={() => window.dispatchEvent(new Event(PLAY_GAME.event))}
              className={cn(CHIP, 'cursor-pointer pointer-coarse:hidden')}
            >
              {body}
            </button>
          );
        }
        return (
          <AppLink key={href} href={href} className={CHIP}>
            {body}
          </AppLink>
        );
      })}
    </div>
  );
}
