import Image from 'next/image';
import { ABOUT_CHAT } from './content';
import { FollowUps } from './FollowUps';

type EmptyChatProps = {
  // the opener ("Who are you?") and the photo's question, offered as the first suggestions
  opener: string;
  question: string;
  onAsk: (question: string) => void;
  onPhoto: () => void;
};

export function EmptyChat({ opener, question, onAsk, onPhoto }: EmptyChatProps) {
  const { src, width, height, alt } = ABOUT_CHAT.emptyPhoto;
  const { empty } = ABOUT_CHAT;
  return (
    <div className="m-auto flex animate-rise flex-col items-center gap-5 py-4">
      <button
        type="button"
        onClick={onPhoto}
        aria-label={question}
        title={question}
        className="bracket-frame block w-36 cursor-pointer border border-line p-1.5 transition-[translate,border-color] duration-300 ease-out-quint outline-none hover:-translate-y-1 hover:border-fringe-b/60 focus-visible:-translate-y-1 focus-visible:border-fringe-b active:translate-y-0 sm:w-44"
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="block aspect-[3/4] w-full object-cover"
        />
      </button>
      <p className="group/ask cursor-default text-body text-fg-soft">
        {empty.before}
        <span className="inline-grid grid-cols-[0fr] align-bottom transition-[grid-template-columns] duration-380 ease-spring group-hover/ask:grid-cols-[1fr]">
          <span className="min-w-0 overflow-x-clip">
            <span className="inline-block scale-50 -rotate-8 pl-[0.3em] text-fringe-b opacity-0 transition-[scale,opacity] duration-380 ease-pop group-hover/ask:scale-100 group-hover/ask:opacity-100">
              {empty.aside}
            </span>
          </span>
        </span>{' '}
        {empty.after}
      </p>
      <div className="flex justify-center">
        <FollowUps
          questions={[opener, question]}
          disabled={false}
          onAsk={(q) => (q === question ? onPhoto() : onAsk(q))}
        />
      </div>
    </div>
  );
}
