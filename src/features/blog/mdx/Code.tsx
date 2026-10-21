import { isValidElement, type ComponentPropsWithoutRef, type ReactElement } from 'react';
import { cn } from '@/lib/cn';

export function InlineCode({ className, ...rest }: ComponentPropsWithoutRef<'code'>) {
  return (
    <code
      className={cn('border border-line bg-fg/5 px-1 py-px font-code text-code text-fg', className)}
      {...rest}
    />
  );
}

export function CodeBlock({ className, children, ...rest }: ComponentPropsWithoutRef<'pre'>) {
  const child = isValidElement(children) ? (children as ReactElement<{ className?: string }>) : null;
  const lang = child?.props.className?.match(/language-([\w-]+)/)?.[1];
  return (
    <div className="bracket-frame relative border border-line bg-black">
      {lang && (
        <span className="absolute top-2 right-3 font-code text-small text-fg-faint uppercase select-none">
          {lang}
        </span>
      )}
      <pre
        className={cn(
          'overflow-x-auto p-5 font-code text-code text-fg-soft',
          '[&>code]:border-0 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit',
          className,
        )}
        {...rest}
      >
        {children}
      </pre>
    </div>
  );
}
