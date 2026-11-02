import { type Language, fallbackLanguage, wordsIn } from '@/app/words';
import { Separator } from '@/components/ui/separator';

/**
 * The band at the foot of every page: who makes Emi, and the two sentences that say what Emi is
 * not. It is one line rather than three, because the honesty gate reads a denial as approved only
 * where a sentence ends in front of it, and what a reader sees is one line anyway.
 */
export function SiteFooter({ language = fallbackLanguage }: { language?: Language }) {
  return (
    <footer className="bg-ground px-margin pt-margin pb-marginMd">
      <Separator className="mb-margin" />
      <p className="font-text text-body-sm text-secondaryText">{wordsIn(language).footerLine}</p>
    </footer>
  );
}
