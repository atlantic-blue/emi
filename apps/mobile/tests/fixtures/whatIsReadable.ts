export function readableIn(_payload: Uint8Array, _text: string): boolean {
  throw new Error('whether a text is readable in a payload is not written yet');
}

// The caller builds this at module scope, so a throw here stops the file being collected at all
// and no case runs to fail.
export function theFieldAndItsValue(_field: string, _value: number | string | boolean): string {
  return '';
}
