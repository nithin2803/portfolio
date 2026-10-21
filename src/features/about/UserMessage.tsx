import Image from 'next/image';
import { ABOUT_CHAT } from './content';

export function UserMessage({ id, text, photo }: { id: number; text: string; photo?: boolean }) {
  const { src, width, height, alt } = ABOUT_CHAT.emptyPhoto;
  return (
    <div data-user={id} className="flex animate-rise flex-col items-end gap-2">
      <span className="text-small font-medium text-fg-faint">{ABOUT_CHAT.you}</span>
      {photo && (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="block aspect-[3/4] w-24 border border-fringe-b/40 object-cover"
        />
      )}
      <p className="max-w-[80%] border border-fringe-b/40 bg-fringe-b/10 px-3.5 py-2 text-chat break-words whitespace-pre-wrap text-fg">
        {text}
      </p>
    </div>
  );
}
