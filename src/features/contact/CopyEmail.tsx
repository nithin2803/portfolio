'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { CONTACT } from './content';

const RESET_MS = 1600;

export function CopyEmail({ email, className }: { email: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), RESET_MS);
    return () => clearTimeout(id);
  }, [copied]);

  return (
    <button
      type="button"
      title={CONTACT.copyEmail}
      onClick={() => navigator.clipboard.writeText(email).then(() => setCopied(true))}
      className={cn(
        'inline-flex items-center gap-1.5 text-small text-fg-muted transition-colors outline-none hover:text-white focus-visible:text-white',
        className,
      )}
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        {copied ? (
          <path d="M2.5 8.5 6 12l7.5-8" />
        ) : (
          <>
            <path d="M5.5 5.5h8v8h-8z" />
            <path d="M10.5 3V2.5h-8v8H3" />
          </>
        )}
      </svg>
      <span aria-live="polite">{copied ? CONTACT.copied : CONTACT.copy}</span>
    </button>
  );
}
