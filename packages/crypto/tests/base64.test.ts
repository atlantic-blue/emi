import { Base64Error, base64Of, bytesFromBase64 } from '../src/base64';

const bytesOf = (length: number): Uint8Array =>
  new Uint8Array(length).map((_, at) => (at * 37 + 11) % 256);

describe('base 64 means the same thing on the phone and in the service', () => {
  describe('writing bytes', () => {
    it.each([0, 1, 2, 3, 4, 5, 31, 32, 63, 64])(
      'agrees with the platform on %i bytes',
      (length) => {
        const bytes = bytesOf(length);

        expect(base64Of(bytes)).toBe(Buffer.from(bytes).toString('base64'));
      },
    );

    it('pads to a whole group, so the length is always a multiple of four', () => {
      expect(base64Of(bytesOf(1))).toHaveLength(4);
      expect(base64Of(bytesOf(2))).toHaveLength(4);
      expect(base64Of(bytesOf(4))).toHaveLength(8);
    });
  });

  describe('reading it back', () => {
    it.each([0, 1, 2, 3, 32, 64])('returns the same %i bytes it was given', (length) => {
      const bytes = bytesOf(length);

      expect([...bytesFromBase64(base64Of(bytes))]).toEqual([...bytes]);
    });

    it('reads what the platform wrote', () => {
      const bytes = bytesOf(32);

      expect([...bytesFromBase64(Buffer.from(bytes).toString('base64'))]).toEqual([...bytes]);
    });
  });

  describe('refusing text that is not base 64', () => {
    it('refuses a character outside the alphabet rather than skipping it', () => {
      expect(() => bytesFromBase64('AAAA*AAA')).toThrow(Base64Error);
    });

    it('refuses a length that is not a whole number of groups', () => {
      expect(() => bytesFromBase64('AAA')).toThrow(Base64Error);
    });

    it('refuses padding in the middle', () => {
      expect(() => bytesFromBase64('A=AA')).toThrow(Base64Error);
    });

    it('names the refusal on the error, so a caller matches the reason', () => {
      try {
        bytesFromBase64('AAA');
        throw new Error('the reader accepted text that is not base 64');
      } catch (thrown) {
        expect((thrown as Base64Error).refusal).toBe('text-is-not-base64');
      }
    });
  });
});
