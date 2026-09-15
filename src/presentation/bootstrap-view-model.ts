import type { CoreStatus } from '../core/status';

export interface BootstrapViewModel {
  readonly title: string;
  readonly summary: string;
  readonly coreStatus: string;
  readonly boundaries: readonly string[];
}

export function createBootstrapViewModel(status: CoreStatus): BootstrapViewModel {
  return Object.freeze({
    title: 'Sandimations',
    summary: 'Interactive, deterministic explanations of CyberSand performance techniques.',
    coreStatus: status.deterministic
      ? 'Deterministic core boundary active'
      : 'Core boundary unavailable',
    boundaries: Object.freeze([
      'Simulation core',
      'Scheduler / runner / trace contracts',
      'Presentation adapters',
      'Browser UI and rendering',
    ]),
  });
}
