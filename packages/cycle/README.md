# @emi/cycle

The arithmetic of a cycle, and the catalogue of things she can log. Every function here is pure. The
package reads no clock, opens no database and makes no request, so a test gives it days and reads
the answer.

## What it exports

`cyclesFrom` turns her day records into cycles. A cycle starts on the first bleeding day that is not
marked unexpected, and it ends the day before the next such day. `completeCycles` and `cycleLengths`
read that list. `toDay`, `addDays` and `daysBetween` do the date arithmetic in whole days, with no
time zone anywhere.

`forecastFrom` returns one of two answers. Under two complete cycles it returns `Learning`, which
says how many more it needs. Above that it returns a `Forecast`: the median of the last six lengths,
the spread of those lengths, a `start` range, an estimated ovulation day and a fertile window from
five days before it to one day after.

`confidenceBands` holds the three bands, and each one carries the figure its edge comes from and the
paper that reports it. `confidenceFor` reads a spread and returns the band.

`symptoms` is the catalogue: seventy entries across eight groups. `loggableSymptoms` leaves out the
retired ones, `findSymptom` resolves a retired slug anyway, and `unknownSymptomSlugs` returns the
offenders rather than a boolean, so a refusal can name them.

## How to run its tests

From the root of the repository:

    npm run test:workspace

To run this package alone:

    npx jest --config jest.node.config.js packages/cycle

## The trap

The prediction is arithmetic and it is not intelligence. It is a median, a spread, and a luteal
length of thirteen days subtracted from a date. Nothing learns, and nothing is sent anywhere. Do not
describe it as more than that, in a comment, on a screen or in a store listing, because the code
does not support the claim.

Two rules follow from it. The forecast is a range and never a single day: a woman told the
fourteenth who bleeds on the sixteenth was told something false. And a band edge carries a citation,
because an edge somebody felt was right would be shown to her as a measurement.

The slug is the last trap, and it is smaller. The slug is the only part of a symptom written into a
record, so it never changes. A symptom that is no longer offered keeps its slug and stays in the
catalogue with `retiredOn` set, because six cycles of her history point at it.
