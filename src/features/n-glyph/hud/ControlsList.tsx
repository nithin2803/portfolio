import Image from 'next/image';
import { Keycap } from '@/components/ui';
import { CONTROLS, type ControlInput } from '../content';

function InputChip({ input }: { input: ControlInput }) {
  if ('icon' in input) {
    return (
      <Keycap className="px-0.75">
        {/* icons are black line art */}
        <Image
          src={`/assets/icons/${input.icon}.webp`}
          alt={input.alt}
          width={14}
          height={14}
          className="size-3.5 opacity-90 invert"
        />
      </Keycap>
    );
  }
  return <Keycap>{input.key}</Keycap>;
}

export function ControlsList() {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1.5">
      {CONTROLS.map(({ inputs, label }) => (
        <div key={label} className="contents">
          <div className="flex items-center gap-1">
            {inputs.map((input, i) => (
              <InputChip key={i} input={input} />
            ))}
          </div>
          <span data-scramble={label} className="text-right">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
