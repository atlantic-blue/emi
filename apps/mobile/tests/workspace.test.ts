import { packageName as content } from '@emi/content';
import { packageName as crypto } from '@emi/crypto';
import { packageName as cycle } from '@emi/cycle';
import { packageName as tokens } from '@emi/tokens';

describe('the workspace packages', () => {
  it('each resolve from the application', () => {
    expect([content, crypto, cycle, tokens]).toEqual([
      '@emi/content',
      '@emi/crypto',
      '@emi/cycle',
      '@emi/tokens',
    ]);
  });
});
