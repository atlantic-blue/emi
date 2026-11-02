import { type Language, languages, wordsIn } from '@/app/words';
import { cn } from '@/lib/utils';

/**
 * How each language names itself, which is the name a reader of that language looks for. The short
 * form is what the header has room to draw, and the full name is what a screen reader says, so a
 * woman who hears the page hears "Русский" rather than two letters.
 */
const nameOf: Readonly<Record<Language, { readonly short: string; readonly own: string }>> = {
  en: { short: 'EN', own: 'English' },
  ru: { short: 'RU', own: 'Русский' },
  es: { short: 'ES', own: 'Español' },
};

/**
 * Three links, one for each language the site serves. Links and not a control: the site ships no
 * script of its own, so the switcher works before anything has loaded, and a reader who opens one
 * in a new tab gets the page rather than nothing.
 */
export function LanguageSwitcher({ language }: { language: Language }) {
  return (
    <nav aria-label={wordsIn(language).languageLabel} className="flex items-center gap-spaceXs">
      {languages.map((spoken) => (
        <a
          aria-current={spoken === language ? 'page' : undefined}
          aria-label={nameOf[spoken].own}
          className={cn(
            'rounded-full px-spaceSm py-spaceXs font-text text-label-md',
            spoken === language ? 'bg-accentSoft text-accentSoftInk' : 'text-secondaryText',
          )}
          href={`/${spoken}/`}
          hrefLang={spoken}
          key={spoken}
          lang={spoken}
        >
          {nameOf[spoken].short}
        </a>
      ))}
    </nav>
  );
}
