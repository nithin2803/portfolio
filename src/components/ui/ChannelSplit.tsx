// keep one colour channel, so the three can be offset separately like the hero's shader does
const CHANNEL = {
  red: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
  green: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
  blue: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0',
};

// An SVG filter that pulls the colour channels apart, red one way and blue the other, so white edges fringe
// red, yellow, cyan and blue. Set the split on the offsets marked data-split (-1 for red, 1 for blue).
export function ChannelSplit({ id }: { id: string }) {
  return (
    <filter id={id} x="-50%" y="-20%" width="200%" height="140%" colorInterpolationFilters="sRGB">
      <feColorMatrix in="SourceGraphic" values={CHANNEL.red} />
      <feOffset data-split="-1" result="red" />
      <feColorMatrix in="SourceGraphic" values={CHANNEL.green} result="green" />
      <feColorMatrix in="SourceGraphic" values={CHANNEL.blue} />
      <feOffset data-split="1" result="blue" />
      <feBlend in="red" in2="green" mode="screen" result="redGreen" />
      <feBlend in="redGreen" in2="blue" mode="screen" />
    </filter>
  );
}

// sets the split, in the filter's units (px for HTML, user units in an SVG)
export function setSplit(root: Element, split: number) {
  for (const offset of root.querySelectorAll<SVGFEOffsetElement>('[data-split]'))
    offset.setAttribute('dx', (split * Number(offset.dataset.split)).toFixed(3));
}
