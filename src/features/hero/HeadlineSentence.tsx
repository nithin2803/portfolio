import { GlitchText } from '@/components/ui';
import { HEADLINE } from './content';
import { NameWithBubble } from './NameWithBubble';
import { PlaceTime } from './PlaceTime';

type HeadlineSentenceProps = {
  focusable?: boolean;
};

export function HeadlineSentence({ focusable = false }: HeadlineSentenceProps) {
  return (
    <>
      {HEADLINE.greeting} <NameWithBubble focusable={focusable} />,<br />
      {HEADLINE.article}{' '}
      <GlitchText className="pointer-events-auto cursor-default">{HEADLINE.role}</GlitchText> {HEADLINE.based}{' '}
      <PlaceTime focusable={focusable} />.
    </>
  );
}
