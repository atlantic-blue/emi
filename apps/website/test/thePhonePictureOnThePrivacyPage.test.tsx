import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PNG } from 'pngjs';
import { renderToStaticMarkup } from 'react-dom/server';

import RootLayout from '../app/[lang]/layout';
import PrivacyPage from '../app/[lang]/privacy/page';
import { languages } from '../app/words';
import { declarationsOf, stylesheetFor, websiteWorkspace } from './stylesheet';

/**
 * The phone the page draws under its title, and where the browser stops drawing it.
 *
 * The screenshot is 846 px tall and the frame is 420 px tall, so the browser shows part of it and
 * crops the rest. Nothing in the markup says which part, and nothing in the screenshot says where
 * a row of the screen ends, so the two can drift apart and every test that reads words still
 * passes. A reader then meets a sentence cut in half at the foot of the picture.
 *
 * So this file reads both sides and puts them together: the frame and the crop out of the
 * stylesheet the site serves, the rows and the rules out of the pixels of the screenshot itself.
 * It asks one thing of the answer. The frame has to stop on a rule between two rows, and never
 * part way down a line of text.
 *
 * The screenshot is one picture in one language, and the page draws the same file in all three, so
 * each language is read rather than only the first. A page that drew it differently for a reader
 * of Russian or of Spanish would be a page two of them read cut off.
 */

/** Compiling the stylesheet of a whole page takes longer than the tier's own limit allows. */
const longEnoughToCompile = 120_000;

const theScreenshot = join(websiteWorkspace, 'public', 'the-privacy-screen.png');

/** How far the foot of the frame may sit from the rule it stops on, in pixels of the screenshot. */
const closeEnoughToTheRule = 2;

/** A colour as the picture holds it, with no alpha, because the screenshot is opaque throughout. */
type Colour = readonly [number, number, number];

/** The rows a part of the picture occupies, counted down from the top. */
interface Rows {
  readonly from: number;
  /** The row under the part, which is the first row that is not it. */
  readonly to: number;
}

/** What the frame does with the screenshot, read out of the rules the site serves. */
interface TheFrame {
  readonly width: number;
  readonly height: number;
  readonly fit: string;
  readonly position: string;
}

function theWholeDocumentIn(lang: string): Promise<string> {
  return PrivacyPage({ params: Promise.resolve({ lang }) })
    .then((page) => RootLayout({ children: page, params: Promise.resolve({ lang }) }))
    .then((document) => renderToStaticMarkup(document));
}

/**
 * The one picture the page draws in the part it owns. The bands at the top and the foot belong to
 * the layout and carry drawings of their own, so the search starts where the page starts.
 */
function thePictureIn(document: string): string {
  const opens = document.indexOf('<main');
  const main = document.slice(opens, document.indexOf('</main>'));
  const found = [...main.matchAll(/<img\b[^>]*>/g)].map(([tag]) => tag);

  if (found.length !== 1) {
    throw new Error(`The page draws ${found.length} pictures where it used to draw one.`);
  }

  return found[0] ?? '';
}

function classesOf(tag: string): string[] {
  const found = /class="([^"]*)"/.exec(tag);

  return found === null ? [] : (found[1] ?? '').split(/\s+/).filter((name) => name.length > 0);
}

/** One declaration out of everything a set of classes draws, by the property it sets. */
function theValueOf(property: string, drawn: string): string {
  const found = new RegExp(`(?:^|[;\\s])${property}:\\s*([^;]+)`).exec(drawn);

  if (found === null) {
    throw new Error(`The picture sets no ${property}. It draws: ${drawn}`);
  }

  return (found[1] ?? '').trim();
}

async function theFrameOf(tag: string): Promise<TheFrame> {
  const classes = classesOf(tag);
  const stylesheet = await stylesheetFor(classes);
  const drawn = classes.map((name) => declarationsOf(stylesheet, name)).join(' ');

  return {
    width: Number.parseFloat(theValueOf('width', drawn)),
    height: Number.parseFloat(theValueOf('height', drawn)),
    fit: theValueOf('object-fit', drawn),
    position: theValueOf('object-position', drawn),
  };
}

/**
 * The rows of the screenshot the frame shows, in the screenshot's own pixels.
 *
 * Only the two shapes the page is allowed to use are read. A keyword other than `top`, or a second
 * length, or a fit other than `cover`, means the page crops in a way this reader cannot measure,
 * and a reader that guessed would report a picture nobody drew.
 */
function whatTheFrameShows(frame: TheFrame, picture: PNG): Rows {
  if (frame.fit !== 'cover') {
    throw new Error(`The picture is fitted with ${frame.fit}, which this reader cannot measure.`);
  }

  const scale = Math.max(frame.width / picture.width, frame.height / picture.height);
  const drawnHeight = picture.height * scale;

  const down = frame.position.split(/\s+/)[1] ?? frame.position;
  const away = downBy(down, frame.height, drawnHeight);

  return { from: -away / scale, to: (frame.height - away) / scale };
}

/**
 * How far the top of the drawn picture sits from the top of the frame, in the pixels the browser
 * draws. A length is that offset outright. A share, which `top` is the name of none, is that share
 * of the room the frame has left over, and the room is negative because the picture is the taller
 * of the two.
 */
function downBy(down: string, frameHeight: number, drawnHeight: number): number {
  if (down === 'top') {
    return 0;
  }

  if (down.endsWith('px')) {
    return Number.parseFloat(down);
  }

  if (down.endsWith('%')) {
    return (Number.parseFloat(down) / 100) * (frameHeight - drawnHeight);
  }

  throw new Error(`The picture is placed at ${down}, which this reader cannot measure.`);
}

function colourAt(picture: PNG, x: number, y: number): Colour {
  const at = (y * picture.width + x) * 4;

  return [picture.data[at] ?? 0, picture.data[at + 1] ?? 0, picture.data[at + 2] ?? 0];
}

function isNearly(one: Colour, other: Colour, tolerance: number): boolean {
  return one.every((part, at) => Math.abs(part - (other[at] ?? 0)) <= tolerance);
}

const white: Colour = [255, 255, 255];

/**
 * The white card that holds the rows of the screen, as the rows of the picture it covers. It is
 * the only wide run of white in a picture whose every other ground is a tint, so it is found by
 * counting white across each row rather than by a number somebody wrote down.
 */
function theCardIn(picture: PNG): Rows {
  const whiteAcross = (y: number): number => {
    let counted = 0;

    for (let x = 0; x < picture.width; x += 1) {
      if (isNearly(colourAt(picture, x, y), white, 3)) {
        counted += 1;
      }
    }

    return counted;
  };

  const mostlyWhite = (y: number): boolean => whiteAcross(y) > picture.width / 2;

  const rows = [...Array(picture.height).keys()].filter(mostlyWhite);
  const from = rows[0];
  const to = rows[rows.length - 1];

  if (from === undefined || to === undefined) {
    throw new Error('The screenshot holds no white card, so its rows cannot be read.');
  }

  return { from, to: to + 1 };
}

/**
 * Every rule between two rows of the card: a row of the picture where one colour that is not the
 * card runs across most of the card. A line of text is many colours and covers a fraction of the
 * width, so it is not mistaken for one.
 */
function theRulesIn(picture: PNG, card: Rows): number[] {
  const rules: number[] = [];

  for (let y = card.from; y < card.to; y += 1) {
    const counted = new Map<string, number>();

    for (let x = 0; x < picture.width; x += 1) {
      const colour = colourAt(picture, x, y);

      if (!isNearly(colour, white, 4)) {
        const name = colour.join(',');

        counted.set(name, (counted.get(name) ?? 0) + 1);
      }
    }

    const widest = Math.max(0, ...counted.values());

    if (widest > picture.width / 2) {
      rules.push(y);
    }
  }

  return rules;
}

/**
 * Every line of text in the picture, as the rows it covers. Read as ink rather than as words: a
 * row carrying any pixel dark enough to be read is part of a line, and the rows around it that
 * carry none are the space between two lines.
 *
 * The whole picture and not only the card, because the title of the screen stands above the card
 * and a crop that climbed far enough would cut that instead.
 */
function theLinesOfTextIn(picture: PNG, card: Rows): Rows[] {
  const hasInk = (y: number): boolean => {
    for (let x = 0; x < picture.width; x += 1) {
      if (colourAt(picture, x, y).every((part) => part < 120)) {
        return true;
      }
    }

    return false;
  };

  const lines: Rows[] = [];
  let open: number | null = null;

  for (let y = card.from; y < card.to; y += 1) {
    if (hasInk(y)) {
      open ??= y;
    } else if (open !== null) {
      lines.push({ from: open, to: y });
      open = null;
    }
  }

  if (open !== null) {
    lines.push({ from: open, to: card.to });
  }

  return lines;
}

describe('the phone the page that explains the encryption draws under its title', () => {
  const picture = PNG.sync.read(readFileSync(theScreenshot));
  const card = theCardIn(picture);
  const rules = theRulesIn(picture, card);
  const lines = theLinesOfTextIn(picture, { from: 0, to: picture.height });

  it('holds a card of rows divided by rules, which is what the frame has to stop on', () => {
    expect(rules.length).toBeGreaterThan(0);
    expect(lines.length).toBeGreaterThan(0);
  });

  describe.each(languages)('read in %s', (lang) => {
    it(
      'stops on a rule between two rows, so the last row she reads is a whole one',
      async () => {
        const frame = await theFrameOf(thePictureIn(await theWholeDocumentIn(lang)));
        const shown = whatTheFrameShows(frame, picture);

        const above = rules.filter((rule) => rule <= shown.to);
        const last = above[above.length - 1];

        expect(last).toBeDefined();
        expect(shown.to - (last ?? 0)).toBeLessThanOrEqual(closeEnoughToTheRule);
      },
      longEnoughToCompile,
    );

    it(
      'cuts no line of text in half, which is what a reader meets at the foot of the picture',
      async () => {
        const frame = await theFrameOf(thePictureIn(await theWholeDocumentIn(lang)));
        const shown = whatTheFrameShows(frame, picture);

        const cut = lines.filter((line) => line.from < shown.to && line.to > shown.to);

        expect(cut).toEqual([]);
      },
      longEnoughToCompile,
    );

    it(
      'still starts above the title of the screen, so the top of the screen is whole too',
      async () => {
        const frame = await theFrameOf(thePictureIn(await theWholeDocumentIn(lang)));
        const shown = whatTheFrameShows(frame, picture);

        const firstLine = lines[0] ?? { from: 0, to: 0 };

        expect(shown.from).toBeGreaterThanOrEqual(0);
        expect(shown.from).toBeLessThan(firstLine.from);
      },
      longEnoughToCompile,
    );
  });
});
