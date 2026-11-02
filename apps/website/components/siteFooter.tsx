import { type Language, type SiteWordKey, fallbackLanguage, wordsIn } from '@/app/words';
import { Separator } from '@/components/ui/separator';

/**
 * The band at the foot of every page: who makes Emi, and the two sentences that say what Emi is
 * not. It is one line rather than three, because the honesty gate reads a denial as approved only
 * where a sentence ends in front of it, and what a reader sees is one line anyway.
 */
/** The four groups the band at the foot of the page carries once it is built from the board. */
export const footerGroups: readonly {
  readonly title: SiteWordKey;
  readonly links: readonly { readonly word: SiteWordKey; readonly path?: string }[];
}[] = [
  {
    title: 'footerEmiGroup',
    links: [
      { word: 'footerAppStore' },
      { word: 'footerBeta' },
      { word: 'footerBuyOnTheWeb', path: 'buy/' },
    ],
  },
  {
    title: 'footerPrivacyGroup',
    links: [
      { word: 'footerHowEmiProtects', path: 'privacy/' },
      { word: 'footerOpenCode' },
      { word: 'footerTransparency', path: 'pulse/' },
    ],
  },
  {
    title: 'footerLearnGroup',
    links: [
      { word: 'footerCalculator', path: 'calculator/' },
      { word: 'footerGuides', path: 'calculator/' },
      { word: 'footerPulse', path: 'pulse/' },
    ],
  },
  {
    title: 'footerHelpGroup',
    links: [
      { word: 'footerSupport', path: 'support/' },
      { word: 'footerCommunity' },
      { word: 'footerAccount', path: 'sign-in/' },
    ],
  },
];

export function SiteFooter({ language = fallbackLanguage }: { language?: Language }) {
  return (
    <footer className="bg-ground px-margin pt-margin pb-marginMd">
      <Separator className="mb-margin" />
      <p className="font-text text-body-sm text-secondaryText">
        {wordsIn(language).footerDisclaimer}
      </p>
    </footer>
  );
}
