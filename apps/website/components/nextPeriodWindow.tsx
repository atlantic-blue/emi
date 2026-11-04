'use client';

import { useSyncExternalStore } from 'react';

import { type Language, wordsIn } from '@/app/words';
import { asADayNumber, theDayOf, theDayWritten, theWindowOn } from '@/lib/theNextPeriodRange';

/**
 * The one sentence of the forecast card that is worked out rather than written: the window her
 * next period would fall in, twelve days after the day she opens the page.
 *
 * It is drawn twice. The server draws it for the day the server is reading, so the card says a
 * sensible window before a single script has run and to a reader whose scripts never run. Then her
 * browser draws it again for her own day, which is what corrects a page that came out of a cache
 * an hour or a day old.
 *
 * The clock is read the way React reads anything outside itself, with the server's day as the
 * answer the first draw gives. The first draw on her machine has to be the server's sentence or
 * React would find two different documents and throw the page away, and this hands it that
 * sentence and then reads the clock.
 *
 * Nothing subscribes to the clock. A woman reading one page over midnight is one day out on an
 * example that is not hers, and a page that redrew itself under her is worse than that.
 */
const theClockTellsNobody = () => () => {};

export function NextPeriodWindow({
  drawnOn,
  language,
}: {
  drawnOn: string;
  language: Language;
}): React.ReactNode {
  const opened = useSyncExternalStore(
    theClockTellsNobody,
    () => asADayNumber(theDayOf(new Date())),
    () => drawnOn,
  );

  return <>{theWindowOn(wordsIn(language), theDayWritten(opened))}</>;
}
