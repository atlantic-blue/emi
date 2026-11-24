import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  claimsIn,
  describeClaim,
  interfaceOnlyWording,
} from '../../../../tools/pipeline/forbiddenClaims';
import {
  amountsOfMoneyIn,
  interfaceClaimsIn,
  interfaceClaimsUnder,
  scannedInterfaceFiles,
  theAmountInCents,
  theAmountsTheApplicationMayName,
  theFileThatHoldsThePrices,
  theHostOfTheWebsite,
} from '../../../../tools/pipeline/interfaceClaims';
import { theProductsEmiSells } from '../../src/services/store/theProducts';

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');

const aScreen = 'apps/mobile/src/features/forecast/FertileWindow.tsx';
const theCatalogue = 'apps/mobile/src/language/english.ts';
const aDocument = 'docs/design/app-store-payments.md';

/**
 * A word the lists already hold, read out of one of them rather than written here, so this file
 * carries no claim of its own and the repository wide scan can read it with everything else.
 */
function theWordStartingWith(beginning: string, list: readonly string[]): string {
  const found = list.find((wording) => wording.startsWith(beginning));

  if (found === undefined) {
    throw new Error(`no wording on the list starts with "${beginning}"`);
  }

  return found;
}

const aWordOnlyAScreenRefuses = theWordStartingWith('saf', interfaceOnlyWording);

/** One amount as a woman reads it, which is how each language writes the figure. */
function inEuros(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** A screen saying one thing, which is the smallest file the gate can be asked about. */
function aScreenSaying(said: string): string {
  return `export const line = '${said}';\n`;
}

/** A real file of the application with one sentence added, so the gate reads a file it ships. */
function theCatalogueBut(said: string): string {
  return `${readFileSync(join(repositoryRoot, theCatalogue), 'utf8')}\nexport const added = '${said}';\n`;
}

describe('the wording gate gains the new words', () => {
  describe('the host of the website', () => {
    it('refuses a screen that names it, and names the file and the host', () => {
      const [described] = interfaceClaimsIn(
        aScreen,
        aScreenSaying(`Pay on ${theHostOfTheWebsite} instead`),
      ).map(describeClaim);

      expect(described).toContain(aScreen);
      expect(described).toContain(theHostOfTheWebsite);
      expect(described).toContain('instead');
    });

    it('refuses it in a file the application ships, and not only in a sentence written here', () => {
      const claims = interfaceClaimsIn(
        theCatalogue,
        theCatalogueBut(`Read more at ${theHostOfTheWebsite}`),
      );

      expect(claims.map(({ wording }) => wording)).toEqual([theHostOfTheWebsite]);
    });

    it('leaves a document alone, which has room to say where else she can pay', () => {
      const document = `The site sells the yearly plan at ${theHostOfTheWebsite}, through Stripe.`;

      expect(claimsIn(aDocument, document)).toEqual([]);
      expect(interfaceClaimsIn(aScreen, document)).toHaveLength(1);
    });
  });

  describe('the word Stars', () => {
    it('is on the list a screen is held to', () => {
      expect(interfaceOnlyWording).toContain('stars');
    });

    it('refuses a screen that names it', () => {
      const [claim] = interfaceClaimsIn(aScreen, aScreenSaying('Pay with Telegram Stars'));

      expect(claim?.wording).toBe('stars');
      expect(claim?.context).toContain('Telegram');
    });

    it('leaves a document alone, which has room to say the route was dropped', () => {
      expect(
        claimsIn(aDocument, 'Telegram Stars is dropped, and nothing of it was built.'),
      ).toEqual([]);
    });
  });

  describe('an amount of money', () => {
    it.each(theProductsEmiSells.map((product) => [inEuros(product.priceInEuroCents)]))(
      'passes the gate at %s euros, which is a price the App Store holds',
      (amount) => {
        expect(interfaceClaimsIn(aScreen, aScreenSaying(`${amount} euros a year`))).toEqual([]);
      },
    );

    it('refuses a fourth amount, and names it', () => {
      const [described] = interfaceClaimsIn(aScreen, aScreenSaying('9.99 euros a year')).map(
        describeClaim,
      );

      expect(described).toContain('9.99 euros');
      expect(described).toContain(aScreen);
    });

    it('refuses the amount the website asks for the Black Friday year', () => {
      const [claim] = interfaceClaimsIn(aScreen, aScreenSaying('19.50 euros a year, every year'));

      expect(claim?.wording).toBe('19.50 euros');
      expect(theAmountsTheApplicationMayName).not.toContain(1950);
    });

    it('holds the Black Friday product to 19.99 euros, which is not half of the yearly price', () => {
      const [yearly] = theProductsEmiSells;

      expect(theAmountsTheApplicationMayName).toContain(1999);
      expect(theAmountInCents('19.99 euros') * 2).not.toBe(yearly?.priceInEuroCents);
    });

    it('reads the figure rather than the words, so each language passes', () => {
      expect(interfaceClaimsIn(aScreen, aScreenSaying('19,99 € в год'))).toEqual([]);
      expect(interfaceClaimsIn(aScreen, aScreenSaying('39 евро в год'))).toEqual([]);
      expect(interfaceClaimsIn(aScreen, aScreenSaying('€39 a year'))).toEqual([]);
      expect(interfaceClaimsIn(aScreen, aScreenSaying('9,99 € в год'))).toHaveLength(1);
    });

    it('is refused in a comment and in a name, the way every other word is', () => {
      expect(interfaceClaimsIn(aScreen, '// the old price was 29.99 euros\n')).toHaveLength(1);
      expect(interfaceClaimsIn(aScreen, 'export const priceWas = "29.99 euros";\n')).toHaveLength(
        1,
      );
    });

    it('reads a figure with no currency beside it as a figure, because a screen is built on those', () => {
      expect(amountsOfMoneyIn('opacity: 0.42, radius: 12, fourteen days')).toEqual([]);
      expect(interfaceClaimsIn(aScreen, 'export const opacity = 0.42;\n')).toEqual([]);
    });
  });

  describe('the module that holds the three prices', () => {
    it('is the one the amounts are read from, so the gate reads it from there', () => {
      expect(theFileThatHoldsThePrices).toBe('apps/mobile/src/services/store/theProducts.ts');
      expect([...theAmountsTheApplicationMayName].sort((a, b) => a - b)).toEqual([500, 1999, 3900]);
    });

    it('is read from rather than read, because its own words name the website and its amount', () => {
      const held = readFileSync(join(repositoryRoot, theFileThatHoldsThePrices), 'utf8');

      expect(held).toContain(theHostOfTheWebsite);
      expect(held).toContain('19.50 euros');
      expect(interfaceClaimsIn(theFileThatHoldsThePrices, held)).toEqual([]);
    });

    it('is held to the words every other file is held to', () => {
      const mutated = readFileSync(join(repositoryRoot, theFileThatHoldsThePrices), 'utf8').replace(
        'The yearly plan.',
        `The yearly plan, and a ${aWordOnlyAScreenRefuses} day.`,
      );

      expect(interfaceClaimsIn(theFileThatHoldsThePrices, mutated)).toHaveLength(2);
    });
  });

  describe('the application as it stands today', () => {
    it('names no host, no amount but the three, and says how much it read', () => {
      const scanned = scannedInterfaceFiles(repositoryRoot);

      expect(interfaceClaimsUnder(repositoryRoot, scanned).map(describeClaim)).toEqual([]);
      expect(scanned).toContain(theFileThatHoldsThePrices);
      expect(scanned.length).toBeGreaterThan(20);
    });

    it('names the yearly price in all three languages, and the gate reads it', () => {
      const amounts = ['english.ts', 'russian.ts', 'spanish.ts'].map((name) =>
        amountsOfMoneyIn(
          readFileSync(join(repositoryRoot, 'apps/mobile/src/language', name), 'utf8'),
        ).map(theAmountInCents),
      );

      expect(amounts).toEqual([[3900], [3900], [3900]]);
    });
  });
});
