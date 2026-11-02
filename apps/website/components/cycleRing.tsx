'use client';

import { useState } from 'react';

import { colour, websiteColour } from '@emi/tokens';

import { type Language, type SiteWordKey, wordsIn } from '@/app/words';

/**
 * The ring of the hero, which is the one part of the page that answers her while she reads it. She
 * moves the slider and the ring says which phase that day of a cycle falls in.
 *
 * The arithmetic is the board's own, from the script in
 * `docs/design/website/home-v2/boards/MainV2.dc.html`, and the four phases it paints are the four
 * the application paints on her home screen, out of the one palette in `packages/tokens`.
 *
 * It says about 31, and it is drawn over a whole circle of 31 days, because this ring is not hers.
 * It is a ring of a cycle nobody has lived, so a reader can see what the application does before
 * she installs it, and the forecast from her own days is the thing the band below describes.
 */

/** The longest cycle the ring is drawn for, which is the whole circle. */
const THE_LONGEST_CYCLE = 31;

/** The middle of the canvas the ring is drawn on, which is what the marker turns around. */
const THE_CENTRE = 160;

/** Which of the four phases a day falls in, as the word key the middle of the ring draws. */
export function phaseKeyOf(day: number): SiteWordKey {
  if (day <= 5) {
    return 'ringPeriod';
  }

  if (day <= 16) {
    return 'ringFollicular';
  }

  if (day <= 21) {
    return 'ringOvulation';
  }

  return 'ringLuteal';
}

/**
 * Where the marker sits, as the turn the browser is handed. Half a day is taken off so the marker
 * lands in the middle of its day rather than on the line between two of them, and a quarter turn is
 * taken off because the circle starts at the top and a browser starts it at three o'clock.
 */
export function markerTransformOf(day: number): string {
  const degrees = ((day - 0.5) / THE_LONGEST_CYCLE) * 360 - 90;

  return `rotate(${degrees.toFixed(1)} ${THE_CENTRE} ${THE_CENTRE})`;
}

/** The four arcs of the ring, each the span of one phase, in the order the board paints them. */
const theArcs: readonly { readonly outline: string; readonly paint: string }[] = [
  { outline: 'M 163.12 41.04 A 119 119 0 0 1 259.80 95.19', paint: colour.period },
  { outline: 'M 262.53 99.60 A 119 119 0 0 1 151.70 278.71', paint: colour.follicular },
  { outline: 'M 146.53 278.24 A 119 119 0 0 1 53.97 214.02', paint: colour.ovulation },
  { outline: 'M 51.71 209.35 A 119 119 0 0 1 156.88 41.04', paint: colour.luteal },
];

export function CycleRing({ language }: { language: Language }) {
  const [day, setDay] = useState(8);

  const words = wordsIn(language);
  const phase = words[phaseKeyOf(day)];

  return (
    <div className="flex flex-[1_1_340px] flex-col items-center gap-margin">
      <div className="relative h-[320px] w-[320px] max-w-full">
        <svg
          aria-label={words.ringLabel
            .replace('{day}', `${day}`)
            .replace('{phase}', phase.toLowerCase())}
          className="block h-auto max-w-full"
          height="320"
          role="img"
          viewBox="0 0 320 320"
          width="320"
        >
          <g fill="none" strokeLinecap="butt" strokeWidth={26}>
            {theArcs.map(({ outline, paint }) => (
              <path d={outline} key={outline} stroke={paint} />
            ))}
          </g>
          <g transform={markerTransformOf(day)}>
            <rect
              fill={websiteColour.siteCard}
              height="7"
              rx="3.5"
              stroke={colour.text}
              strokeWidth={1.5}
              width="33"
              x="264"
              y="156.5"
            />
            <polygon fill={colour.period} points="300,160 312,154 312,166" />
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-[0px] flex flex-col items-center justify-center gap-spaceXs text-center">
          <span className="text-[12px] leading-[16px] font-semibold tracking-[0.02em] text-siteText">
            {phase}
          </span>
          <span className="text-[56px] leading-[60px] font-semibold tracking-[-0.03em]">
            {words.ringDay.replace('{day}', `${day}`)}
          </span>
          <span className="text-[16px] leading-[24px] text-siteQuietText">{words.ringOfAbout}</span>
        </div>
      </div>
      <label className="flex w-full max-w-[320px] flex-col gap-spaceSm text-center text-[14px] leading-[20px] text-siteQuietText">
        {words.ringMove}
        {/* A browser gives a range control a margin of its own, and the reset this site is
            built on takes it away, which draws the hero four pixels shorter than the board. */}
        <input
          className="m-[2px] min-h-[44px] w-full accent-siteSlider"
          max={THE_LONGEST_CYCLE}
          min={1}
          onChange={(moved) => setDay(Number(moved.target.value))}
          step={1}
          type="range"
          value={day}
        />
      </label>
    </div>
  );
}
