// a custom property's computed value, for canvas code that draws in the site's colours
export const cssVar = (name: string, el: Element = document.documentElement) =>
  getComputedStyle(el).getPropertyValue(name).trim();
