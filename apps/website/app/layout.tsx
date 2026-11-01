import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Emi',
  description: 'A period and cycle tracker that keeps your records to yourself.',
};

/**
 * Every page the site serves arrives inside this document. The language is declared here rather
 * than on each page, because a reader whose software speaks the words aloud reads the attribute
 * and not the words.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
