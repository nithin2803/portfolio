import Image from 'next/image';
import type { LinkIcon } from '@/lib/icons';
import { cn } from '@/lib/cn';
import { NMark } from './NMark';

type LinkIconViewProps = { icon: LinkIcon; className?: string };

const SQUARE = 'inline-block h-[0.9em] w-[0.9em] align-[-0.08em]';

const MAIL =
  '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M1 3h14v10H1z" fill="none" stroke="#000" stroke-width="1.5"/><path d="M1.5 3.5 8 9l6.5-5.5" fill="none" stroke="#000" stroke-width="1.5"/></svg>';
const DOC =
  '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M3 1.5h6.5L13 5v9.5H3z M9.5 1.5V5H13" fill="none" stroke="#000" stroke-width="1.5"/><path d="M5.5 8.5h5M5.5 11h5" stroke="#000" stroke-width="1.5"/></svg>';
const PLAY =
  '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M4 2.5v11L13 8z" fill="none" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/></svg>';
const EXTERNAL =
  '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M5 3h8v8M13 3 3 13" fill="none" stroke="#000" stroke-width="1.5"/></svg>';

const dataUrl = (svg: string) => `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

// mono icons are a mask filled with `tint`, the full foreground colour (`bright`: white logos, which shouldn't
// fade with muted text around them), or the text colour (glyphs like mail); colour ones keep their own fills
type SvgIconProps = { svg: string; color?: boolean; tint?: string; bright?: boolean; className?: string };

function SvgIcon({ svg, color, tint, bright, className }: SvgIconProps) {
  const url = dataUrl(svg);
  const style = color
    ? {
        backgroundImage: url,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }
    : {
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        ...(tint && { backgroundColor: tint }),
      };
  return (
    <span
      aria-hidden="true"
      className={cn(SQUARE, !color && !tint && (bright ? 'bg-fg' : 'bg-current'), className)}
      style={style}
    />
  );
}

export function LinkIconView({ icon, className }: LinkIconViewProps) {
  switch (icon.kind) {
    case 'image':
      return (
        <Image
          src={icon.src}
          alt=""
          width={icon.width}
          height={icon.height}
          className={cn(
            'inline-block h-[0.9em] w-auto align-[-0.12em]',
            icon.invert && 'hue-rotate-180 invert',
            className,
          )}
        />
      );
    case 'favicon':
      // served by /api/favicon, already cached and lightened, so it needs no optimizer
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/favicon/${encodeURIComponent(icon.site)}`}
          alt=""
          width={16}
          height={16}
          loading="lazy"
          className={cn(SQUARE, 'rounded-[2px]', className)}
        />
      );
    case 'site':
      return (
        <span aria-hidden="true" className={cn(SQUARE, className)}>
          <NMark size={11} />
        </span>
      );
    case 'svg':
      return <SvgIcon svg={icon.svg} color={icon.color} tint={icon.tint} bright className={className} />;
    case 'mail':
      return <SvgIcon svg={MAIL} className={className} />;
    case 'doc':
      return <SvgIcon svg={DOC} className={className} />;
    case 'play':
      return <SvgIcon svg={PLAY} className={className} />;
    case 'external':
      return <SvgIcon svg={EXTERNAL} className={className} />;
  }
}
