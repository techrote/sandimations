import { describe, expect, it } from 'vitest';
import {
  PhasedSamplingScheduler,
  phaseForCell,
  type PhasedSamplingPattern,
} from '../../src/core/scheduler/phased-sampling';

function coordinateKey(x: number, y: number): string {
  return `${x}:${y}`;
}

describe('PhasedSamplingScheduler', () => {
  it('assigns every evaluable cell to exactly one phase and selects only that bucket', () => {
    const scheduler = new PhasedSamplingScheduler(10, 7, 4, 'diagonal-lattice', 123);
    const snapshot = scheduler.getSnapshot();
    expect(snapshot.activeCellCount).toBe(48);

    const seen = new Set<string>();
    for (let phase = 0; phase < 4; phase += 1) {
      const selected = scheduler.beginPhase(phase, phase);
      expect(selected.length).toBeGreaterThan(0);
      for (const cell of selected) {
        const key = coordinateKey(cell.x, cell.y);
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        expect(phaseForCell('diagonal-lattice', cell.x, cell.y, 4, 123)).toBe(phase);
      }
    }
    expect(seen.size).toBe(snapshot.activeCellCount);
  });

  it.each([
    'diagonal-lattice',
    'vertical-stripes',
    'seeded-hash',
  ] satisfies readonly PhasedSamplingPattern[])(
    'reproduces the same %s buckets for the same configuration',
    (pattern) => {
      const left = new PhasedSamplingScheduler(17, 11, 5, pattern, 0x12345678);
      const right = new PhasedSamplingScheduler(17, 11, 5, pattern, 0x12345678);

      for (let phase = 0; phase < 5; phase += 1) {
        expect(left.beginPhase(phase, phase)).toEqual(right.beginPhase(phase, phase));
      }
      expect(left.getSnapshot()).toEqual(right.getSnapshot());
    },
  );

  it('uses the seed only where the declared pattern requires it', () => {
    expect(phaseForCell('diagonal-lattice', 7, 3, 4, 1)).toBe(
      phaseForCell('diagonal-lattice', 7, 3, 4, 999),
    );
    expect(phaseForCell('vertical-stripes', 7, 3, 4, 1)).toBe(
      phaseForCell('vertical-stripes', 7, 3, 4, 999),
    );

    const first = Array.from({ length: 20 }, (_, index) =>
      phaseForCell('seeded-hash', (index % 5) + 1, Math.floor(index / 5), 4, 1),
    );
    const second = Array.from({ length: 20 }, (_, index) =>
      phaseForCell('seeded-hash', (index % 5) + 1, Math.floor(index / 5), 4, 999),
    );
    expect(first).not.toEqual(second);
  });
});
