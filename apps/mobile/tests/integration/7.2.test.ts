import {
  theBlackFridayProduct,
  theBlackFridayWindowCloses,
  theMonthlyPlan,
  theOneLevel,
  theProductsEmiSells,
  theSubscriptionGroup,
  theYearlyPlan,
} from '../../src/services/store/theProducts';

/**
 * An instant is read in London, because the window the operator set is a day in London and the
 * instant that closes it is the same moment in every other zone.
 */
const inLondon = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  dateStyle: 'short',
  timeStyle: 'short',
});

const aMillisecondBeforeItCloses = new Date(theBlackFridayWindowCloses.getTime() - 1);

describe('the product configuration, and a test that reads it', () => {
  describe('the group that holds every plan', () => {
    it('names the one subscription group', () => {
      expect(theSubscriptionGroup).toBe('Emi');
    });

    it('sells three products, in the one group', () => {
      expect(theProductsEmiSells.map((product) => product.identifier)).toEqual([
        'blue.atlantic.emi.yearly',
        'blue.atlantic.emi.monthly',
        'blue.atlantic.emi.yearly.halfprice',
      ]);
    });

    it('puts all three at one level, so a move between them is a crossgrade', () => {
      expect(theOneLevel).toBe(1);
      expect(theProductsEmiSells.map((product) => product.level)).toEqual([1, 1, 1]);
    });
  });

  describe('what each product costs, and how long it runs', () => {
    it('sells one year for 39 euros, and opens it with one free month', () => {
      expect(theYearlyPlan).toEqual({
        identifier: 'blue.atlantic.emi.yearly',
        runsFor: 'one year',
        priceInEuroCents: 3900,
        level: 1,
        freeMonth: true,
      });
    });

    it('sells one month for 5 euros', () => {
      expect(theMonthlyPlan).toEqual({
        identifier: 'blue.atlantic.emi.monthly',
        runsFor: 'one month',
        priceInEuroCents: 500,
        level: 1,
        freeMonth: false,
      });
    });

    it('sells the Black Friday year for 19.99 euros', () => {
      expect(theBlackFridayProduct).toEqual({
        identifier: 'blue.atlantic.emi.yearly.halfprice',
        runsFor: 'one year',
        priceInEuroCents: 1999,
        level: 1,
        freeMonth: false,
      });
    });

    it('asks 19.99 euros for the Black Friday year, which is not half of the yearly amount', () => {
      expect(theBlackFridayProduct.priceInEuroCents).toBe(1999);
      expect(theBlackFridayProduct.priceInEuroCents * 2).not.toBe(theYearlyPlan.priceInEuroCents);
    });
  });

  describe('the free month', () => {
    it('gives the free month to the yearly plan, and to no other product', () => {
      const withAnOffer = theProductsEmiSells.filter((product) => product.freeMonth);

      expect(withAnOffer.map((product) => product.identifier)).toEqual([
        'blue.atlantic.emi.yearly',
      ]);
    });

    it('carries no offer on the monthly plan', () => {
      expect(theMonthlyPlan.freeMonth).toBe(false);
    });

    it('carries no offer on the Black Friday product', () => {
      expect(theBlackFridayProduct.freeMonth).toBe(false);
    });
  });

  describe('the instant the Black Friday window closes', () => {
    it('closes at the end of 1 December 2026 in London', () => {
      expect(theBlackFridayWindowCloses.toISOString()).toBe('2026-12-02T00:00:00.000Z');
    });

    it('keeps the last minute of 1 December inside the window', () => {
      expect(inLondon.format(aMillisecondBeforeItCloses)).toBe('01/12/2026, 23:59');
    });

    it('closes as 2 December opens', () => {
      expect(inLondon.format(theBlackFridayWindowCloses)).toBe('02/12/2026, 00:00');
    });
  });
});
