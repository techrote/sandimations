import type { WorldSnapshot } from '../model/world';

export interface HashableRunnerState {
  readonly scenarioId: string;
  readonly seed: number;
  readonly frame: number;
  readonly phase: number;
  readonly tick: number;
  readonly phaseCount: number;
  readonly prngState: number;
  readonly world: WorldSnapshot;
}

function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function hashDeterministicState(state: HashableRunnerState): string {
  const canonical = [
    `scenario=${state.scenarioId}`,
    `seed=${state.seed >>> 0}`,
    `frame=${state.frame}`,
    `phase=${state.phase}`,
    `tick=${state.tick}`,
    `phaseCount=${state.phaseCount}`,
    `prng=${state.prngState >>> 0}`,
    `world=${state.world.width}x${state.world.height}`,
    `cells=${state.world.cells.join(',')}`,
  ].join('|');

  return fnv1a(canonical);
}
