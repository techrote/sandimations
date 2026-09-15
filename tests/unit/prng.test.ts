import { describe, expect, it } from 'vitest';
import { SeededPrng } from '../../src/core/random/prng';

describe('SeededPrng', () => {
  it('matches the fixed SD-002 reference vector', () => {
    const prng = new SeededPrng(0x12345678);
    expect(Array.from({ length: 6 }, () => prng.nextUint32())).toEqual([
      0x1b2cc72e,
      0xf0f77b89,
      0xf09b5c53,
      0x3bdfdfd7,
      0xe7930f7b,
      0xc740a7fb,
    ]);
  });

  it('treats zero as a valid deterministic seed', () => {
    const first = new SeededPrng(0);
    const second = new SeededPrng(0);
    expect(first.nextUint32()).toBe(0x4434b462);
    expect(second.nextUint32()).toBe(0x4434b462);
  });
});
