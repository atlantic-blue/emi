import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { TheStoreSaidNothing, thePlansInTheStore } from '../../src/services/store/thePlans';
import {
  type AProductInTheStore,
  theBlackFridayProduct,
  theMonthlyPlan,
  theProductsEmiSells,
  theSubscriptionGroup,
  theYearlyPlan,
} from '../../src/services/store/theProducts';
import { theStoreOnThisPhone } from '../../src/services/store/theStoreOnThisPhone';
import {
  aProductTheStoreHolds,
  theReadsOfTheProducts,
  theStoreAnswersNothing,
  theStoreCannotBeReached,
  theStoreHolds,
  theStoreRefusesTheRead,
  theStoreStartsAgain,
  whatTheLibraryWasAsked,
} from '../fixtures/expoIap';

jest.mock('expo-iap', () => jest.requireActual('../fixtures/expoIap'));

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const theApplication = join(repositoryRoot, 'apps', 'mobile');

/** What the store quotes for each product, which is a figure in her own currency and not ours. */
const theWordsTheStoreQuotes: Readonly<Record<string, string>> = {
  'blue.atlantic.emi.yearly': '39,00 €',
  'blue.atlantic.emi.monthly': '5,00 €',
  'blue.atlantic.emi.yearly.halfprice': '19,99 €',
};

function theStoreHoldsEveryProduct(): void {
  theStoreHolds(
    theProductsEmiSells.map((product) =>
      aProductTheStoreHolds(product.identifier, theWordsTheStoreQuotes[product.identifier] ?? ''),
    ),
  );
}

/** The file the simulator reads, so the plans answer with no sandbox account behind them. */
interface TheConfigurationFile {
  readonly subscriptionGroups: readonly {
    readonly name: string;
    readonly subscriptions: readonly {
      readonly productID: string;
      readonly displayPrice: string;
      readonly recurringSubscriptionPeriod: string;
      readonly groupNumber: number;
      readonly introductoryOffer: { readonly paymentMode: string } | null;
    }[];
  }[];
}

function theConfigurationFile(): TheConfigurationFile {
  return JSON.parse(
    readFileSync(join(theApplication, 'storekit', 'Emi.storekit'), 'utf8'),
  ) as TheConfigurationFile;
}

/** The period the store writes, for the period the record holds. */
const thePeriodOf: Readonly<Record<AProductInTheStore['runsFor'], string>> = {
  'one year': 'P1Y',
  'one month': 'P1M',
};

interface WhatAnAppleBuildLinks {
  readonly modules: readonly {
    readonly packageName: string;
    readonly packageVersion: string;
    readonly pods: readonly { readonly podName: string }[];
    readonly modules: readonly { readonly class: string }[];
  }[];
}

/**
 * What Expo links into an Apple build, read from the resolver the generated Podfile itself calls.
 * A package named in the manifest is not a package in the binary. The resolver is what finds the
 * native module, out of the `expo-module.config.json` of each installed package, and a build
 * carries whatever it names here.
 */
function whatAnAppleBuildLinks(): WhatAnAppleBuildLinks {
  const resolver = join(
    repositoryRoot,
    'node_modules',
    'expo-modules-autolinking',
    'bin',
    'expo-modules-autolinking.js',
  );

  return JSON.parse(
    execFileSync(process.execPath, [resolver, 'resolve', '-p', 'apple', '--json'], {
      cwd: theApplication,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }),
  ) as WhatAnAppleBuildLinks;
}

describe('the purchase library, and a binary that starts', () => {
  beforeEach(() => {
    theStoreStartsAgain();
  });

  describe('the plans the store answers', () => {
    it('asks the store for the three products of the record, as subscriptions', async () => {
      theStoreHoldsEveryProduct();

      await thePlansInTheStore(theStoreOnThisPhone);

      expect(theReadsOfTheProducts()).toEqual([
        {
          skus: [
            'blue.atlantic.emi.yearly',
            'blue.atlantic.emi.monthly',
            'blue.atlantic.emi.yearly.halfprice',
          ],
          type: 'subs',
        },
      ]);
    });

    it('opens the connection before it reads, and reads once', async () => {
      theStoreHoldsEveryProduct();

      await thePlansInTheStore(theStoreOnThisPhone);

      expect(whatTheLibraryWasAsked()).toEqual(['initConnection', 'fetchProducts']);
    });

    it('keeps the order of the record, whatever order the store answers in', async () => {
      theStoreHolds(
        [...theProductsEmiSells]
          .reverse()
          .map((product) =>
            aProductTheStoreHolds(
              product.identifier,
              theWordsTheStoreQuotes[product.identifier] ?? '',
            ),
          ),
      );

      const named = await thePlansInTheStore(theStoreOnThisPhone);

      expect(named.plans.map((plan) => plan.product.identifier)).toEqual([
        theYearlyPlan.identifier,
        theMonthlyPlan.identifier,
        theBlackFridayProduct.identifier,
      ]);
    });

    it('shows the price the store quotes, and not the euro cents of the record', async () => {
      theStoreHoldsEveryProduct();

      const named = await thePlansInTheStore(theStoreOnThisPhone);

      expect(named.plans.map((plan) => plan.priceInWords)).toEqual([
        '39,00 €',
        '5,00 €',
        '19,99 €',
      ]);
      expect(named.plans.map((plan) => plan.currency)).toEqual(['EUR', 'EUR', 'EUR']);
    });

    it('names the identifiers the store does not hold, and offers the rest', async () => {
      theStoreHolds([aProductTheStoreHolds(theYearlyPlan.identifier, '39,00 €')]);

      const named = await thePlansInTheStore(theStoreOnThisPhone);

      expect(named.plans.map((plan) => plan.product.identifier)).toEqual([
        theYearlyPlan.identifier,
      ]);
      expect(named.theStoreNamedNo).toEqual([
        theMonthlyPlan.identifier,
        theBlackFridayProduct.identifier,
      ]);
    });

    it('offers no plan where the store answers nothing at all', async () => {
      theStoreAnswersNothing();

      const named = await thePlansInTheStore(theStoreOnThisPhone);

      expect(named.plans).toEqual([]);
      expect(named.theStoreNamedNo).toEqual(
        theProductsEmiSells.map((product) => product.identifier),
      );
    });

    it('names nothing missing where the store holds all three', async () => {
      theStoreHoldsEveryProduct();

      const named = await thePlansInTheStore(theStoreOnThisPhone);

      expect(named.plans).toHaveLength(3);
      expect(named.theStoreNamedNo).toEqual([]);
    });
  });

  describe('a store that answers nothing', () => {
    async function whatTheReadRaised(): Promise<TheStoreSaidNothing> {
      let raised: unknown;

      try {
        await thePlansInTheStore(theStoreOnThisPhone);
      } catch (problem) {
        raised = problem;
      }

      expect(raised).toBeInstanceOf(TheStoreSaidNothing);

      return raised as TheStoreSaidNothing;
    }

    it('says the store cannot be reached, and reads no product at all', async () => {
      theStoreHoldsEveryProduct();
      theStoreCannotBeReached();

      expect((await whatTheReadRaised()).because).toBe('theStoreCannotBeReached');
      expect(theReadsOfTheProducts()).toEqual([]);
    });

    it('says the read was refused where the connection opened and the read did not', async () => {
      theStoreHoldsEveryProduct();
      theStoreRefusesTheRead();

      expect((await whatTheReadRaised()).because).toBe('theReadWasRefused');
      expect(whatTheLibraryWasAsked()).toEqual(['initConnection', 'fetchProducts']);
    });
  });

  describe('the configuration file the simulator reads', () => {
    it('holds the three products of the record, in the one group, at one level', () => {
      const groups = theConfigurationFile().subscriptionGroups;

      expect(groups.map((group) => group.name)).toEqual([theSubscriptionGroup]);
      expect(groups[0]?.subscriptions.map((one) => one.productID)).toEqual(
        theProductsEmiSells.map((product) => product.identifier),
      );
      expect(groups[0]?.subscriptions.map((one) => one.groupNumber)).toEqual([1, 1, 1]);
    });

    it('quotes the price the record holds, in euros, for every product', () => {
      const quoted = theConfigurationFile().subscriptionGroups[0]?.subscriptions ?? [];

      expect(quoted.map((one) => one.displayPrice)).toEqual(
        theProductsEmiSells.map((product) => (product.priceInEuroCents / 100).toFixed(2)),
      );
    });

    it('runs each product for the period the record holds', () => {
      const quoted = theConfigurationFile().subscriptionGroups[0]?.subscriptions ?? [];

      expect(quoted.map((one) => one.recurringSubscriptionPeriod)).toEqual(
        theProductsEmiSells.map((product) => thePeriodOf[product.runsFor]),
      );
    });

    it('opens the one product that carries a free month with a free month, and no other', () => {
      const quoted = theConfigurationFile().subscriptionGroups[0]?.subscriptions ?? [];

      expect(quoted.map((one) => one.introductoryOffer?.paymentMode ?? null)).toEqual(
        theProductsEmiSells.map((product) => (product.freeMonth ? 'free' : null)),
      );
    });
  });

  describe('the library in an Apple build', () => {
    it('is declared by the application at one version, with no range', () => {
      const manifest = JSON.parse(readFileSync(join(theApplication, 'package.json'), 'utf8')) as {
        readonly dependencies: Readonly<Record<string, string>>;
      };

      expect(manifest.dependencies['expo-iap']).toBe('6.5.1');
    });

    it('is linked into an Apple build as the pod ExpoIap, with the module ExpoIapModule', () => {
      const linked = whatAnAppleBuildLinks().modules.find((one) => one.packageName === 'expo-iap');

      expect(linked?.packageVersion).toBe('6.5.1');
      expect(linked?.pods.map((pod) => pod.podName)).toEqual(['ExpoIap']);
      expect(linked?.modules.map((one) => one.class)).toEqual(['ExpoIapModule']);
    });
  });
});
