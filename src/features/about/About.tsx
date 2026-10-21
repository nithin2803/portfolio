import { getKnowledge } from '@/features/chat/knowledge';
import { HEADLINE_ID, HeadlineSentence } from '@/features/hero';
import { AboutChat } from './AboutChat';

export async function About() {
  const { opener, reserved, links } = await getKnowledge();
  return (
    <AboutChat
      heroId={HEADLINE_ID}
      lead={<HeadlineSentence />}
      opener={opener}
      reserved={reserved}
      links={links}
    />
  );
}
