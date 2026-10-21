import { Children, isValidElement, type ComponentPropsWithoutRef } from 'react';
import { MdxImage } from './MdxImage';

// Markdown wraps a lone image in a <p>; unwrap it so the image can be a <figure>
export function Paragraph({ children, ...rest }: ComponentPropsWithoutRef<'p'>) {
  const only = Children.toArray(children);
  if (only.length === 1 && isValidElement(only[0]) && only[0].type === MdxImage) return <>{children}</>;
  return <p {...rest}>{children}</p>;
}
