import { Keycap } from '@/components/ui';

export function PlusToggleIcon({ open }: { open: boolean }) {
  return (
    <Keycap
      pressed={open}
      className="transition-[rotate,border-color] duration-350 ease-spring group-data-open:rotate-180 group-data-open:border-line-strong"
    >
      <span aria-hidden="true" className="col-start-1 row-start-1 h-px w-2 bg-current" />
      <span
        aria-hidden="true"
        className="col-start-1 row-start-1 h-px w-2 rotate-90 bg-current transition-[rotate] duration-350 ease-spring group-data-open:rotate-0"
      />
    </Keycap>
  );
}
