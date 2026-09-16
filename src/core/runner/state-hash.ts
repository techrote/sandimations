import type { WorldSnapshot } from '../model/world';
import type { ParameterMutationRecord, ParameterStoreSnapshot } from '../parameters/store';
import type { ChunkSchedulerSnapshot } from '../scheduler/chunk-sleep-wake';
import type { PhasedSamplingSnapshot } from '../scheduler/phased-sampling';

export interface HashableRunnerState {
  readonly scenarioId: string;
  readonly seed: number;
  readonly frame: number;
  readonly phase: number;
  readonly tick: number;
  readonly phaseCount: number;
  readonly prngState: number;
  readonly world: WorldSnapshot;
  readonly parameters: ParameterStoreSnapshot;
  readonly chunkScheduler?: ChunkSchedulerSnapshot | null;
  readonly phasedSampling?: PhasedSamplingSnapshot | null;
}

function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function mutationPayload(mutation: ParameterMutationRecord): string {
  return [
    mutation.sequence,
    mutation.parameterId,
    JSON.stringify(mutation.value),
    mutation.mode,
  ].join(':');
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
  ];

  if (state.parameters.nonDefaultValues.length > 0) {
    canonical.push(
      `params=${state.parameters.nonDefaultValues
        .map((entry) => `${entry.id}:${JSON.stringify(entry.value)}`)
        .join(',')}`,
    );
  }
  if (state.parameters.pendingNextStep.length > 0) {
    canonical.push(`next=${state.parameters.pendingNextStep.map(mutationPayload).join(',')}`);
  }
  if (state.parameters.pendingReset.length > 0) {
    canonical.push(`reset=${state.parameters.pendingReset.map(mutationPayload).join(',')}`);
  }
  if (state.chunkScheduler !== undefined && state.chunkScheduler !== null) {
    canonical.push(
      `chunks=${state.chunkScheduler.chunkSize}:${state.chunkScheduler.chunks
        .map((chunk) => `${chunk.id}:${chunk.state}:${chunk.quietFrames}:${chunk.reason ?? ''}`)
        .join(',')}`,
    );
  }
  if (state.phasedSampling !== undefined && state.phasedSampling !== null) {
    const sampling = state.phasedSampling;
    canonical.push(
      `sampling=${sampling.phaseCount}:${sampling.pattern}:${sampling.seed >>> 0}:${sampling.activeCellCount}:${sampling.selectedCellCount}:${sampling.lastExecutedPhase ?? ''}:${sampling.lastExecutedTick ?? ''}:${sampling.cells
        .map((cell) => `${cell.x},${cell.y},${cell.assignedPhase},${cell.lastSelectedTick ?? ''}`)
        .join(';')}`,
    );
  }

  return fnv1a(canonical.join('|'));
}
