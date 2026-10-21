import type { Metadata } from 'next';
import { Inter, Press_Start_2P } from 'next/font/google';
import { Footer } from '@/components/layout/Footer';
import { Nav } from '@/components/layout/Nav';
import { Contact } from '@/features/contact';
import { SITE } from '@/lib/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

// only the Asteroids easter egg uses it, so it loads on demand instead of with every page
const arcade = Press_Start_2P({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-press-start',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: `%s · ${SITE.name}` },
  description: SITE.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${arcade.variable}`}>
      <body>
        <Nav />
        {children}
        {/* the Seattle skyline (and the game) closes every page, like a footer */}
        <Contact />
        <Footer />
      </body>
    </html>
  );
}
