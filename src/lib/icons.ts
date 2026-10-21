export type LinkIcon =
  // a one-colour logo is a stencil filled with `tint` (the text colour without one); `color` keeps the logo's
  // own colours
  | { kind: 'svg'; svg: string; color?: boolean; tint?: string }
  // `invert`: a dark image (a black favicon) flipped so it shows on the dark page
  | { kind: 'image'; src: string; width: number; height: number; invert?: boolean }
  // a site's favicon, fetched and cached by /api/favicon (like the source icons in an AI chat): nothing is saved
  | { kind: 'favicon'; site: string }
  | { kind: 'mail' }
  | { kind: 'doc' }
  | { kind: 'site' }
  | { kind: 'external' };

export type Brand = { icon: LinkIcon; href?: string };
