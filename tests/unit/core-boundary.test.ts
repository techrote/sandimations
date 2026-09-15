import { describe, expect, it } from 'vitest';
import { createCoreStatus } from '../../src/core/status';
import { createBootstrapViewModel } from '../../src/presentation/bootstrap-view-model';

describe('deterministic bootstrap core', () => {
  it('runs in a Node environment without DOM globals', () => {
    expect(typeof globalThis.document).toBe('undefined');

    const status = createCoreStatus();

    expect(status).toEqual({
      name: 'sandimations-core',
      deterministic: true,
      stage: 'bootstrap',
    });
    expect(Object.isFrozen(status)).toBe(true);
  });

  it('feeds presentation data without giving the core a browser dependency', () => {
    const status = createCoreStatus();
    const view = createBootstrapViewModel(status);

    expect(view.coreStatus).toBe('Deterministic core boundary active');
    expect(view.boundaries).toContain('Presentation adapters');
    expect(status.stage).toBe('bootstrap');
  });
});
