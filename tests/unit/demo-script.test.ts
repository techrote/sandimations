import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRESENTATION_SCRIPT,
  executePresentationBeat,
  type PresentationCommandTarget,
} from '../../src/presentation/demo-script';

describe('SD-009 presentation scripts', () => {
  it('executes only through the public controller-shaped command target and view callback', () => {
    const calls: string[] = [];
    const target: PresentationCommandTarget = {
      pause: () => calls.push('pause'),
      stepPhase: () => calls.push('step-phase'),
      stepFrame: () => calls.push('step-frame'),
      stepFrames: (count) => calls.push(`step-frames:${count}`),
      setSpeedPosition: (position) => calls.push(`speed:${position}`),
    };

    for (const beat of DEFAULT_PRESENTATION_SCRIPT) {
      executePresentationBeat(target, (enabled) => calls.push(`view:${enabled}`), beat);
    }

    expect(calls).toEqual([
      'pause',
      'view:true',
      'step-phase',
      'step-phase',
      'step-frame',
      'speed:30',
    ]);
  });
});
