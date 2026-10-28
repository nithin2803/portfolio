export const ABOUT_CHAT = {
  title: 'About me',
  you: 'You',
  author: 'Nithin',
  placeholder: 'Ask Nithin',
  empty: { before: 'Ask me', aside: 'almost', after: 'anything!' },
  emptyPhoto: {
    src: '/assets/images/hike.jpg',
    width: 720,
    height: 960,
    alt: 'Me on a hike, with a mossy green canyon behind me',
  },
  contextFull: 'Context window full',
  newChat: 'New chat',
  jumpToLatest: 'Latest',
  hiccup: 'nythos-6 hiccuped. Try that again in a sec.',
  sourcesLabel: 'read',
  rails: {
    modelCard: 'Model card',
    activations: 'Activations',
    kvCache: 'KV cache',
    context: 'Context',
  },
  timing: {
    chipTypeMs: 22,
    sendMs: 260,
    // the photo reply is local, so it fakes the model's thinking pause and token stream
    photoThinkMs: 700,
    photoWordMs: 45,
  },
} as const;
