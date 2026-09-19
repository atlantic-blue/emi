import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { colour } from '../../packages/tokens/src/colour.ts';
import {
  GROUND,
  PIECE_HEIGHT,
  PIECE_WIDTH,
  TRANSLUCENT_CEILING,
  TRANSLUCENT_FLOOR,
  blurOf,
  drawingOf,
  fileOf,
  fillOf,
  phaseColours,
  pictureOf,
  pieces,
  problemsWith,
  type PhaseColour,
  type Piece,
  type Shape,
} from '../illustration/pieces.ts';
import { refusalsIn, refusedSubjects, sentenceFor, wordsIn } from '../illustration/refusals.ts';

const illustrationDirectory = join(__dirname, '..', 'illustration');

function fileIn(name: string): string {
  return readFileSync(join(illustrationDirectory, name), 'utf8');
}

function filesEnding(extension: string): readonly string[] {
  return readdirSync(illustrationDirectory)
    .filter((file) => file.endsWith(extension))
    .sort();
}

/** A drawing that follows the style, used to show the scan lets one through. */
function abstractDrawing(): string {
  return drawingOf(pieces[0] as (typeof pieces)[number]);
}

/** The same drawing with one layer named after something, which is the mistake being refused. */
function drawingNaming(name: string): string {
  return abstractDrawing().replace('<path d="', `<path id="${name}" d="`);
}

function fillsIn(source: string): readonly string[] {
  return [...source.matchAll(/fill="([^"]*)"/g)].map((found) => found[1] as string);
}

function attributesNamed(source: string, attribute: string): readonly string[] {
  return [...source.matchAll(new RegExp(`(?<![\\w-])${attribute}="([^"]*)"`, 'g'))].map(
    (found) => found[1] as string,
  );
}

describe('an illustration carrying a forbidden subject is refused', () => {
  describe('the five subjects the style refuses', () => {
    it('names the five the design names, and no sixth', () => {
      expect(refusedSubjects.map((refused) => refused.subject)).toEqual([
        'a body',
        'a face',
        'a flower',
        'a droplet',
        'blood',
      ]);
    });

    it('gives each one a reason, so a refusal is an argument rather than a rule', () => {
      for (const refused of refusedSubjects) {
        expect(refused.reason.length).toBeGreaterThan(20);
        expect(refused.words.length).toBeGreaterThan(0);
      }
    });

    it.each(refusedSubjects.flatMap((refused) => refused.words.map((word) => [word] as const)))(
      'refuses a layer named %s',
      (word) => {
        const refused = refusalsIn('welcome.svg', drawingNaming(word));

        expect(refused.map((offence) => offence.word)).toContain(word);
      },
    );

    it('refuses the subject wherever the case falls', () => {
      expect(refusalsIn('welcome.svg', drawingNaming('BLOOD'))).toHaveLength(1);
      expect(refusalsIn('welcome.svg', drawingNaming('Flower'))).toHaveLength(1);
    });

    it('takes a joined name apart, so a subject inside one word is still found', () => {
      expect(wordsIn('bloodDrop')).toEqual(['blood', 'drop']);
      expect(wordsIn('blood-drop')).toEqual(['blood', 'drop']);
      expect(wordsIn('blood_drop')).toEqual(['blood', 'drop']);
      expect(refusalsIn('welcome.svg', drawingNaming('bloodDrop'))).toHaveLength(2);
    });

    it('refuses the file name on its own, because a name travels further than a layer', () => {
      const refused = refusalsIn('petal-field.svg', abstractDrawing());

      expect(refused).toHaveLength(1);
      expect(refused[0]?.where).toBe('the file name');
      expect(refused[0]?.subject).toBe('a flower');
    });

    it('says the drawing, the word, the line and the reason', () => {
      const refused = refusalsIn(
        'welcome.svg',
        '<svg>\n  <path id="uterus" d="M 0 0 Z" />\n</svg>',
      );

      expect(refused).toHaveLength(1);
      expect(sentenceFor(refused[0] as (typeof refused)[number])).toBe(
        'welcome.svg carries a body as the word "uterus" on line 2. Emi refuses a body, because ' +
          'a torso or a belly on the screen names the subject to anybody standing behind her.',
      );
    });

    it('lets an abstract drawing through, rather than refusing whatever it does not understand', () => {
      expect(refusalsIn('welcome.svg', abstractDrawing())).toEqual([]);
      expect(refusalsIn('welcome.svg', drawingNaming('tide'))).toEqual([]);
    });
  });

  describe('the drawings on disk carry none of them', () => {
    it.each(filesEnding('.svg'))(
      '%s names no refused subject, in its name or in any line',
      (file) => {
        expect(refusalsIn(file, fileIn(file)).map(sentenceFor)).toEqual([]);
      },
    );

    it.each(filesEnding('.png'))('%s is a picture whose name carries nothing either', (file) => {
      expect(refusalsIn(file, '').map(sentenceFor)).toEqual([]);
    });

    it('read the drawings rather than an empty directory', () => {
      expect(filesEnding('.svg')).toHaveLength(pieces.length);
      expect(filesEnding('.png')).toHaveLength(pieces.length);
    });
  });

  describe('a piece is two or three soft edged shapes in the phase colours', () => {
    it.each(pieces.map((piece) => [piece.name, piece] as const))(
      '%s lays down two or three shapes and nothing else',
      (_name, piece) => {
        expect(piece.shapes.length).toBeGreaterThanOrEqual(2);
        expect(piece.shapes.length).toBeLessThanOrEqual(3);
        expect(fillsIn(fileIn(fileOf(piece)))).toHaveLength(piece.shapes.length + 1);
      },
    );

    it.each(pieces.flatMap((piece) => piece.shapes.map((shape) => [piece, shape] as const)))(
      'lays every shape down between 20 and 30 percent',
      (_piece, shape) => {
        expect(shape.opacity).toBeGreaterThanOrEqual(TRANSLUCENT_FLOOR);
        expect(shape.opacity).toBeLessThanOrEqual(TRANSLUCENT_CEILING);
      },
    );

    it.each(pieces.map((piece) => [piece.name, piece] as const))(
      '%s draws in the phase colours, on the stone ground, and in no other colour',
      (_name, piece) => {
        const fills = fillsIn(fileIn(fileOf(piece)));
        const approved = phaseColours.map((phase) => colour[fillOf(phase)]);

        expect(fills[0]).toBe(colour[GROUND]);
        for (const fill of fills.slice(1)) {
          expect(approved).toContain(fill);
        }
        for (const shape of piece.shapes) {
          expect(phaseColours).toContain(shape.colour);
        }
        // Every fill is the ground or one of the four phase fills, and nothing else: the brand
        // red reaches a piece only as the ovulation fill the phase palette names.
        expect(fills.filter((fill) => fill !== colour[GROUND] && !approved.includes(fill))).toEqual(
          [],
        );
      },
    );

    it.each(pieces.map((piece) => [piece.name, piece] as const))(
      '%s gives every shape a soft edge, and the shape names the blur it takes',
      (_name, piece) => {
        const drawing = fileIn(fileOf(piece));

        for (const shape of piece.shapes) {
          expect(shape.blur).toBeGreaterThan(0);
          expect(drawing).toContain(`<filter id="${blurOf(piece, shape)}"`);
          expect(drawing).toContain(`filter="url(#${blurOf(piece, shape)})"`);
        }
        expect(attributesNamed(drawing, 'stdDeviation')).toEqual(
          piece.shapes.map((shape) => String(shape.blur)),
        );
      },
    );

    it.each(pieces.map((piece) => [piece.name, piece] as const))(
      '%s swells three times on a turn, so the outline is organic and never a star',
      (_name, piece) => {
        for (const shape of piece.shapes) {
          expect(shape.lobes).toBe(3);
          expect(shape.wobble).toBeGreaterThan(0.05);
        }
      },
    );

    it.each(pieces.map((piece) => [piece.name, piece] as const))(
      '%s draws its outline as curves rather than corners',
      (_name, piece) => {
        const drawing = fileIn(fileOf(piece));

        for (const path of attributesNamed(drawing, 'd')) {
          expect(path.startsWith('M ')).toBe(true);
          expect(path.endsWith(' Z')).toBe(true);
          expect(path).not.toMatch(/[LHV]/);
        }
      },
    );

    it.each(pieces.map((piece) => [piece.name, piece] as const))(
      '%s is drawn on the 320 by 220 canvas',
      (_name, piece) => {
        const drawing = fileIn(fileOf(piece));

        expect(drawing).toContain(`viewBox="0 0 ${PIECE_WIDTH} ${PIECE_HEIGHT}"`);
        expect(drawing).toContain(`width="${PIECE_WIDTH}" height="${PIECE_HEIGHT}"`);
      },
    );
  });

  describe('the committed drawings are what the numbers draw', () => {
    it.each(pieces.map((piece) => [fileOf(piece), piece] as const))(
      '%s on disk is what the generator writes now',
      (_file, piece) => {
        expect(fileIn(fileOf(piece))).toBe(drawingOf(piece));
      },
    );

    it('every drawing in the directory is a piece, and every piece has a drawing', () => {
      expect(filesEnding('.svg')).toEqual(pieces.map(fileOf).sort());
    });

    it('every piece has a picture beside it, because the soft edge cannot be read in the source', () => {
      expect(filesEnding('.png')).toEqual(pieces.map(pictureOf).sort());
      for (const piece of pieces) {
        expect(fileIn(pictureOf(piece)).length).toBeGreaterThan(1000);
      }
    });

    it('draws three pieces, one for each screen of the first run, each saying what it carries', () => {
      expect(pieces.map((piece) => piece.screen)).toEqual(['welcome', 'lastPeriod', 'cycleLength']);
      for (const piece of pieces) {
        expect(piece.says.length).toBeGreaterThan(20);
      }
    });
  });
  describe('a piece that breaks the style is never written', () => {
    const welcome = pieces[0] as Piece;
    const shape = welcome.shapes[0] as Shape;

    function pieceWith(changes: Partial<Piece>): Piece {
      return { ...welcome, ...changes };
    }

    function shapeWith(changes: Partial<Shape>): Shape {
      return { ...shape, ...changes };
    }

    it('refuses a shape named after a flower, and says which subject and why', () => {
      const named = pieceWith({ shapes: [shapeWith({ name: 'petal' }), shape] });

      expect(() => drawingOf(named)).toThrow('carries a flower as the word "petal"');
      expect(() => drawingOf(pieceWith({ name: 'petal-field' }))).toThrow('carries a flower');
    });

    it('refuses a shape laid down outside 20 to 30 percent, naming the shape and the range', () => {
      expect(() => drawingOf(pieceWith({ shapes: [shapeWith({ opacity: 0.35 }), shape] }))).toThrow(
        'lays dawn down at 0.35, outside 0.2 to 0.3',
      );
      expect(() => drawingOf(pieceWith({ shapes: [shapeWith({ opacity: 0.1 }), shape] }))).toThrow(
        'outside 0.2 to 0.3',
      );
    });

    it('refuses a colour that is not one of the four phases', () => {
      const inEmber = shapeWith({ colour: 'ember' as PhaseColour });

      expect(() => drawingOf(pieceWith({ shapes: [inEmber, shape] }))).toThrow(
        'draws dawn in ember, which is not a phase colour',
      );
    });

    it('refuses a hard edge, because every edge here is soft', () => {
      expect(() => drawingOf(pieceWith({ shapes: [shapeWith({ blur: 0 }), shape] }))).toThrow(
        'draws dawn with a hard edge',
      );
    });

    it('refuses one shape and refuses four, because a piece holds two or three', () => {
      expect(() => drawingOf(pieceWith({ shapes: [shape] }))).toThrow(
        'lays down 1 shapes. A piece holds 2 or 3',
      );
      expect(() => drawingOf(pieceWith({ shapes: [shape, shape, shape, shape] }))).toThrow(
        'lays down 4 shapes',
      );
    });

    it('writes a piece that follows the style, rather than refusing whatever it is handed', () => {
      expect(problemsWith(welcome, drawingOf(welcome))).toEqual([]);
      expect(drawingOf(pieceWith({ shapes: [shape, shapeWith({ name: 'tide' })] }))).toContain(
        '<path',
      );
    });
  });
});
