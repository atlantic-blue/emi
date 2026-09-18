import {
  type ChosenUnits,
  findMood,
  findSymptom,
  storedUnits,
  temperature,
  temperatureUnits,
  weight,
  weightUnits,
} from '@emi/cycle';
import { colour, radius, space, typeScale } from '@emi/tokens';

import { counted, deletedSentence, exportCopy, fullDate, fullInstant, wordsOf } from './copy';
import type { Everything, ExportedRow, ExportedValue } from './everything';

/**
 * The file she can read. One page of plain markup with the style inside it, so it opens in
 * anything, prints as it stands, and needs nothing from the network to draw.
 *
 * It is built from the export rather than from the database, so the document and the machine
 * readable file beside it are two readings of one walk and cannot describe different phones.
 */

export const dayLogTable = 'day_log';
export const cycleTable = 'cycle';
export const settingTable = 'setting';

/**
 * The order a day is read in. A field outside it still reaches the page, after these and in its
 * own alphabetical order, because a record written by a later version is hers to read today.
 */
const dayFieldOrder: readonly string[] = [
  'flow',
  'bleedingIsUnexpected',
  'symptoms',
  'moods',
  'energy',
  'temperatureCelsius',
  'weightKilograms',
  'note',
  'recordedAt',
];

/** Wording for the fields this version knows. `wordsOf` names anything else from the field itself. */
const labels: Readonly<Record<string, string>> = {
  bleedingIsUnexpected: 'Unexpected bleeding',
  cycleLengthDays: 'Cycle length you stated',
  firstRunCompletedAt: 'First opened',
  is_predicted: 'Predicted',
  length_days: 'Length',
  lockOnReturn: 'Lock on return',
  period_length_days: 'Period',
  recordedAt: 'Saved',
  temperatureCelsius: 'Temperature',
  temperatureUnit: 'Temperature unit',
  weightKilograms: 'Weight',
  weightUnit: 'Weight unit',
};

export function labelOf(field: string): string {
  return labels[field] ?? wordsOf(field);
}

interface Line {
  readonly label: string;
  readonly value: string;
}

export function readableHtml(everything: Everything): string {
  const units = unitsIn(everything);
  const days = liveDays(everything);
  const cycles = [...(everything.tables[cycleTable] ?? [])].sort(byStart);
  const settings = everything.tables[settingTable] ?? [];
  const deleted = (everything.tables[dayLogTable] ?? []).length - days.length;

  const body = [
    section(
      exportCopy.document.cycles,
      cycles.map((cycle) => cycleBlock(cycle)),
    ),
    section(
      exportCopy.document.days,
      days.map((day) => dayBlock(day, units)),
      deleted > 0 ? deletedSentence(deleted) : undefined,
    ),
    section(
      exportCopy.document.settings,
      settings.length > 0 ? [lines(settings.map(settingLine))] : [],
    ),
  ].join('');

  const held = days.length + cycles.length === 0 ? paragraph(exportCopy.document.nothing) : body;

  return page(everything, held);
}

function page(everything: Everything, body: string): string {
  const taken = fullDate(everything.writtenAt.slice(0, 10));

  return [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8" />',
    `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `<title>${escaped(`${exportCopy.document.title}, ${taken}`)}</title>`,
    `<style>${STYLE}</style></head><body><main>`,
    `<h1>${escaped(exportCopy.document.title)}</h1>`,
    `<p class="taken">${escaped(`Taken on ${taken}.`)}</p>`,
    `<p class="what">${escaped(exportCopy.document.what)}</p>`,
    body,
    '</main></body></html>',
  ].join('');
}

function section(title: string, blocks: readonly string[], note?: string): string {
  if (blocks.length === 0) {
    return '';
  }

  const foot = note === undefined ? '' : `<p class="note">${escaped(note)}</p>`;

  return `<section><h2>${escaped(title)}</h2>${blocks.join('')}${foot}</section>`;
}

function dayBlock(row: ExportedRow, units: ChosenUnits): string {
  const record = asRecord(row.payload);
  const day = typeof row.day === 'string' ? row.day : '';

  return block(fullDate(day), lines(dayLines(record, units)));
}

function dayLines(record: Readonly<Record<string, unknown>>, units: ChosenUnits): Line[] {
  return fieldsIn(record)
    .map((field) => ({ label: labelOf(field), value: dayValue(field, record[field], units) }))
    .filter((line) => line.value.length > 0);
}

/** The known fields in reading order, then anything a later version wrote, in its own order. */
function fieldsIn(record: Readonly<Record<string, unknown>>): string[] {
  const held = Object.keys(record).filter((field) => field !== 'day');
  const known = dayFieldOrder.filter((field) => held.includes(field));
  const rest = held.filter((field) => !dayFieldOrder.includes(field)).sort();

  return [...known, ...rest];
}

function cycleBlock(row: ExportedRow): string {
  const started = text(row.started_on);
  const ended = text(row.ended_on);
  const heading =
    ended.length > 0 ? `${fullDate(started)} to ${fullDate(ended)}` : `From ${fullDate(started)}`;

  const written = Object.keys(row)
    .filter((column) => !['id', 'started_on', 'ended_on'].includes(column))
    .map((column) => ({ label: labelOf(column), value: cycleValue(column, row[column]) }))
    .filter((line) => line.value.length > 0);

  return block(heading, lines(written));
}

function settingLine(row: ExportedRow): Line {
  return { label: labelOf(text(row.key)), value: text(row.value) };
}

function block(heading: string, body: string): string {
  return `<article><h3>${escaped(heading)}</h3>${body}</article>`;
}

function lines(written: readonly Line[]): string {
  if (written.length === 0) {
    return '';
  }

  const rows = written
    .map(
      (line) =>
        `<div class="line"><span class="label">${escaped(line.label)}</span>` +
        `<span class="value">${escaped(line.value)}</span></div>`,
    )
    .join('');

  return `<div class="lines">${rows}</div>`;
}

function paragraph(sentence: string): string {
  return `<p>${escaped(sentence)}</p>`;
}

function dayValue(field: string, value: unknown, units: ChosenUnits): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (field === 'symptoms') {
    return named(value, (slug) => findSymptom(slug)?.name);
  }
  if (field === 'moods') {
    return named(value, (slug) => findMood(slug)?.name);
  }
  if (field === 'energy' && typeof value === 'number') {
    return `${value} of 5`;
  }
  if (field === 'temperatureCelsius' && typeof value === 'number') {
    const shown = temperature.shownIn(value, units.temperature);

    return `${shown.toFixed(1)} ${temperature.symbols[units.temperature]}`;
  }
  if (field === 'weightKilograms' && typeof value === 'number') {
    const shown = weight.shownIn(value, units.weight);

    return `${shown.toFixed(1)} ${weight.symbols[units.weight]}`;
  }
  if (field === 'recordedAt' && typeof value === 'string') {
    return fullInstant(value);
  }

  return plainly(value);
}

/** A cycle's own columns. The cache holds counts and one flag, and a count says what it counts. */
function cycleValue(column: string, value: ExportedValue | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (column === 'is_predicted') {
    return value === 1 ? exportCopy.document.predicted : '';
  }
  if (typeof value === 'number' && column.endsWith('_days')) {
    return counted(value, 'day');
  }

  return plainly(value);
}

/** Anything with no rule of its own: a word she picked reads as a sentence starts, a list joins. */
function plainly(value: unknown): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    return value.map(plainly).filter(Boolean).join(', ');
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value !== 'string') {
    return value === null || value === undefined ? '' : JSON.stringify(value);
  }

  return value.length > 0 && !value.includes(' ') && value === value.toLowerCase()
    ? `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`
    : value;
}

function named(value: unknown, nameOf: (slug: string) => string | undefined): string {
  if (!Array.isArray(value)) {
    return plainly(value);
  }

  // A slug the catalogue has forgotten is still written out, because a day that names it is a day
  // she wrote and a blank line would be the export losing it.
  return value
    .map((slug) => (typeof slug === 'string' ? (nameOf(slug) ?? plainly(slug)) : plainly(slug)))
    .filter(Boolean)
    .join(', ');
}

/** The scales she reads in, taken from the settings in the file itself. */
export function unitsIn(everything: Everything): ChosenUnits {
  const held = new Map(
    (everything.tables[settingTable] ?? []).map((row) => [text(row.key), text(row.value)]),
  );

  return {
    temperature:
      temperatureUnits.find((unit) => unit === held.get('temperatureUnit')) ??
      storedUnits.temperature,
    weight: weightUnits.find((unit) => unit === held.get('weightUnit')) ?? storedUnits.weight,
  };
}

/** What she holds today. A deleted day stays in the data file and is counted under the days. */
function liveDays(everything: Everything): readonly ExportedRow[] {
  return [...(everything.tables[dayLogTable] ?? [])]
    .filter((row) => row.deleted_at === null)
    .sort((one, two) => text(two.day).localeCompare(text(one.day)));
}

function byStart(one: ExportedRow, two: ExportedRow): number {
  return text(two.started_on).localeCompare(text(one.started_on));
}

function asRecord(value: ExportedValue | undefined): Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' ? value : {};
}

function text(value: ExportedValue | undefined): string {
  return typeof value === 'string' ? value : '';
}

function escaped(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const STYLE = `
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: ${space.base}px;
  background: ${colour.stone};
  color: ${colour.ink};
  font-family: system-ui, sans-serif;
  font-size: ${typeScale.body.size}px;
  line-height: ${typeScale.body.lineHeight}px;
}
main { max-width: 720px; margin: 0 auto; }
h1 { font-size: ${typeScale.display.size}px; line-height: ${typeScale.display.lineHeight}px; margin: 0; }
h2 {
  font-size: ${typeScale.heading.size}px;
  line-height: ${typeScale.heading.lineHeight}px;
  margin: ${space.roomy}px 0 ${space.snug}px;
  padding-bottom: ${space.hair}px;
  border-bottom: 1px solid ${colour.hairline};
}
h3 { font-size: ${typeScale.small.size}px; line-height: ${typeScale.small.lineHeight}px; margin: 0 0 ${space.hair}px; color: ${colour.ember}; }
p { margin: ${space.hair}px 0 0; }
.taken { color: ${colour.body}; }
.what { color: ${colour.body}; margin-top: ${space.snug}px; }
.note { color: ${colour.muted}; font-size: ${typeScale.small.size}px; margin-top: ${space.snug}px; }
article {
  background: ${colour.surface};
  border: 1px solid ${colour.hairline};
  border-radius: ${radius.card}px;
  padding: ${space.snug}px;
  margin-bottom: ${space.tight}px;
  break-inside: avoid;
}
.line { display: flex; gap: ${space.snug}px; padding: 2px 0; }
.label { color: ${colour.muted}; flex: 0 0 200px; }
.value { color: ${colour.ink}; flex: 1 1 auto; }
@media print { body { background: ${colour.surface}; } article { break-inside: avoid; } }
`;
