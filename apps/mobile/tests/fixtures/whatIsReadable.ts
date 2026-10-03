/**
 * Whether something she wrote survived into a sealed payload, and how to name the text to look
 * for.
 *
 * Both exports exist because a sealed payload is random bytes, and a search over random bytes
 * finds short text by coincidence. A case that reads a coincidence as a leak fails with no fault
 * in the product, which is how two of these searches have turned a merge red.
 */

/**
 * Whether a text is readable in a payload, in any spelling a leak could arrive in: the text
 * itself, and the two encodings something that wrote it encoded would have used.
 *
 * The text is spelled every way and the payload is read once, never the other way round. Reading
 * the whole payload back as base64 and looking for a plain word finds a coincidence and calls it a
 * leak: three letters of the base64 alphabet fall into that order in about one payload in two
 * thousand, which is how the shortest slug of the symptom catalogue turned a merge red.
 *
 * Length is the caller's part of this. Two digits fall side by side in a payload of a hundred
 * random bytes about once in six hundred payloads, whatever the spelling, so a value is searched
 * for with the field it sits under and never on its own. `theFieldAndItsValue` writes that pair.
 */
export function readableIn(payload: Uint8Array, text: string): boolean {
  const held = Buffer.from(payload).toString('latin1');
  const spellings = [
    text,
    Buffer.from(text, 'utf8').toString('base64'),
    Buffer.from(text, 'utf8').toString('hex'),
  ];

  return spellings.some((spelling) => held.includes(spelling));
}

/**
 * One field of a record and its value, written the way canonical json writes the pair, so the text
 * a case searches for cannot drift from the text a plain payload would hold.
 */
export function theFieldAndItsValue(field: string, value: number | string | boolean): string {
  return `${JSON.stringify(field)}:${JSON.stringify(value)}`;
}
