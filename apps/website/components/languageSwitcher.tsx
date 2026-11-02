import { type Language, languages } from '@/app/words';

/**
 * How each language names itself, which is the name a reader of that language looks for. The site
 * ships no script of its own, so these are links and not a control: the switcher works before
 * anything has loaded, and a reader who opens one in a new tab gets the page rather than nothing.
 */
const ownNameOf: Readonly<Record<Language, string>> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
};

/** Three links, one for each language the site serves, as the board draws them in the legal line. */
export function LanguageSwitcher({ language }: { language: Language }) {
  return (
    <>
      {languages.map((spoken) => (
        <a
          aria-current={spoken === language ? 'page' : undefined}
          className="text-siteQuietText no-underline"
          href={`/${spoken}/`}
          hrefLang={spoken}
          key={spoken}
          lang={spoken}
        >
          {ownNameOf[spoken]}
        </a>
      ))}
    </>
  );
}
