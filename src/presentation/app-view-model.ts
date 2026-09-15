import type {
  ParameterDefinition,
  ParameterMutationMode,
  ParameterValue,
} from '../core/parameters/definitions';
import type { ParameterRegistry } from '../core/parameters/registry';
import type { ParameterMutationRecord } from '../core/parameters/store';
import type { ChunkLifecycleState } from '../core/scheduler/chunk-sleep-wake';
import type { PhasedSamplingPattern } from '../core/scheduler/phased-sampling';
import type { TraceRecordV1 } from '../core/trace/protocol';
import type {
  PresentationEvidenceViewModelV1,
  PresentationTraceRetentionV1,
} from './evidence-adapter';
import type { CellVisual, SimulationViewModel } from './simulation-controller';

export type OverlayKind =
  'evaluated-now' | 'active-not-selected' | 'sleeping' | 'newly-woken' | 'blocked-rejected';

export interface CellOverlayMarker {
  readonly x: number;
  readonly y: number;
  readonly kind: OverlayKind;
}

export interface ChunkPresentationRegion {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly state: ChunkLifecycleState;
  readonly quietFrames: number;
  readonly reason: string | null;
}

export interface SamplingPresentationCell {
  readonly x: number;
  readonly y: number;
  readonly assignedPhase: number;
  readonly lastSelectedTick: number | null;
}

export interface SamplingPresentationState {
  readonly pattern: PhasedSamplingPattern;
  readonly phaseCount: number;
  readonly lastExecutedPhase: number | null;
  readonly lastExecutedTick: number | null;
  readonly activeCellCount: number;
  readonly selectedCellCount: number;
  readonly cells: readonly SamplingPresentationCell[];
}

export interface OverlayLegendItem {
  readonly kind: OverlayKind;
  readonly label: string;
  readonly description: string;
  readonly nonColorCue: string;
}

export interface ParameterControlViewModel {
  readonly definition: ParameterDefinition;
  readonly currentValue: ParameterValue;
  readonly pendingValue: ParameterValue | null;
  readonly pending: boolean;
  readonly timingLabel: string;
  readonly timingDescription: string;
}

export interface RecentTraceEventViewModel {
  readonly sequence: number;
  readonly frame: number;
  readonly phase: number;
  readonly tick: number;
  readonly type: TraceRecordV1['type'];
  readonly summary: string;
}

export interface WorldPresentationViewModel {
  readonly width: number;
  readonly height: number;
  readonly cells: readonly CellVisual[];
  readonly overlays: readonly CellOverlayMarker[];
  readonly chunks: readonly ChunkPresentationRegion[];
  readonly sampling: SamplingPresentationState | null;
  readonly latestEvidenceTick: number | null;
}

export interface AppPresentationViewModel {
  readonly simulation: SimulationViewModel;
  readonly world: WorldPresentationViewModel;
  readonly legend: readonly OverlayLegendItem[];
  readonly parameters: readonly ParameterControlViewModel[];
  readonly metrics: PresentationEvidenceViewModelV1['metrics'];
  readonly provenance: PresentationEvidenceViewModelV1['provenance'];
  readonly traceRetention: PresentationTraceRetentionV1;
  readonly recentEvents: readonly RecentTraceEventViewModel[];
}

const LEGEND: readonly OverlayLegendItem[] = Object.freeze([
  Object.freeze({
    kind: 'evaluated-now',
    label: 'Evaluated now',
    description: 'The model explicitly examined this cell in the latest scheduler phase.',
    nonColorCue: 'Inset frame + center dot',
  }),
  Object.freeze({
    kind: 'active-not-selected',
    label: 'Active, another phase',
    description:
      'The phased scheduler explicitly assigns this active cell to a different phase bucket.',
    nonColorCue: 'Single diagonal slash',
  }),
  Object.freeze({
    kind: 'sleeping',
    label: 'Sleeping / inactive',
    description: 'The scheduler explicitly marks this region computationally dormant.',
    nonColorCue: 'Cross-hatch',
  }),
  Object.freeze({
    kind: 'newly-woken',
    label: 'Newly woken',
    description: 'The scheduler explicitly woke this region during the latest logical frame.',
    nonColorCue: 'Double frame / pulse',
  }),
  Object.freeze({
    kind: 'blocked-rejected',
    label: 'Blocked / rejected',
    description:
      'The model or scheduler explicitly reported that this attempted work could not proceed.',
    nonColorCue: 'X mark',
  }),
]);

const OVERLAY_PRIORITY: Readonly<Record<OverlayKind, number>> = Object.freeze({
  sleeping: 1,
  'active-not-selected': 2,
  'evaluated-now': 3,
  'newly-woken': 4,
  'blocked-rejected': 5,
});

function timingText(mode: ParameterMutationMode): { label: string; description: string } {
  switch (mode) {
    case 'live':
      return {
        label: 'Live',
        description: 'Applies immediately to subsequent deterministic work.',
      };
    case 'next-step':
      return {
        label: 'Next phase',
        description: 'Queues deterministically and applies at the next scheduler phase boundary.',
      };
    case 'reset-required':
      return {
        label: 'Reset required',
        description: 'Queues until Reset rebuilds the deterministic simulation state.',
      };
  }
}

function latestPending(
  mutations: readonly ParameterMutationRecord[],
  parameterId: string,
): ParameterMutationRecord | undefined {
  for (let index = mutations.length - 1; index >= 0; index -= 1) {
    const mutation = mutations[index];
    if (mutation?.parameterId === parameterId) {
      return mutation;
    }
  }
  return undefined;
}

function buildParameters(
  evidence: PresentationEvidenceViewModelV1,
  registry: ParameterRegistry,
): readonly ParameterControlViewModel[] {
  const values = new Map(
    evidence.simulation.parameters.values.map((entry) => [entry.id, entry.value]),
  );

  return Object.freeze(
    registry.list().map((definition) => {
      const currentValue = values.get(definition.id);
      if (currentValue === undefined) {
        throw new Error(`Evidence is missing registered parameter ${definition.id}.`);
      }

      const queue =
        definition.mutation === 'next-step'
          ? evidence.simulation.parameters.pendingNextStep
          : definition.mutation === 'reset-required'
            ? evidence.simulation.parameters.pendingReset
            : [];
      const pendingMutation = latestPending(queue, definition.id);
      const timing = timingText(definition.mutation);

      return Object.freeze({
        definition,
        currentValue,
        pendingValue: pendingMutation?.value ?? null,
        pending: pendingMutation !== undefined,
        timingLabel: timing.label,
        timingDescription: timing.description,
      });
    }),
  );
}

function cellKey(x: number, y: number): string {
  return `${x}:${y}`;
}

function markCell(
  markers: Map<string, CellOverlayMarker>,
  x: number,
  y: number,
  kind: OverlayKind,
): void {
  const key = `${cellKey(x, y)}:${kind}`;
  const existing = markers.get(key);
  if (existing === undefined || OVERLAY_PRIORITY[kind] >= OVERLAY_PRIORITY[existing.kind]) {
    markers.set(key, Object.freeze({ x, y, kind }));
  }
}

function markChunkCells(
  markers: Map<string, CellOverlayMarker>,
  chunk: PresentationEvidenceViewModelV1['scheduler']['chunks'][number],
  kind: OverlayKind,
): void {
  for (let y = chunk.y; y < chunk.y + chunk.height; y += 1) {
    for (let x = chunk.x; x < chunk.x + chunk.width; x += 1) {
      markCell(markers, x, y, kind);
    }
  }
}

function buildSampling(
  evidence: PresentationEvidenceViewModelV1,
): SamplingPresentationState | null {
  const sampling = evidence.scheduler.sampling ?? null;
  if (sampling === null) {
    return null;
  }
  return Object.freeze({
    pattern: sampling.pattern,
    phaseCount: evidence.scheduler.phaseCount,
    lastExecutedPhase: sampling.lastExecutedPhase,
    lastExecutedTick: sampling.lastExecutedTick,
    activeCellCount: sampling.activeCellCount,
    selectedCellCount: sampling.selectedCellCount,
    cells: Object.freeze(sampling.cells.map((cell) => Object.freeze({ ...cell }))),
  });
}

function buildWorld(
  simulation: SimulationViewModel,
  evidence: PresentationEvidenceViewModelV1,
): WorldPresentationViewModel {
  const latestEvidenceTick = evidence.traceRecords.at(-1)?.tick ?? null;
  const markers = new Map<string, CellOverlayMarker>();
  const sampling = buildSampling(evidence);

  for (const chunk of evidence.scheduler.chunks) {
    if (chunk.state === 'sleeping') {
      markChunkCells(markers, chunk, 'sleeping');
    } else if (chunk.state === 'newly-woken') {
      markChunkCells(markers, chunk, 'newly-woken');
    }
  }

  if (sampling?.lastExecutedPhase !== null && sampling !== null) {
    for (const cell of sampling.cells) {
      if (cell.assignedPhase !== sampling.lastExecutedPhase) {
        markCell(markers, cell.x, cell.y, 'active-not-selected');
      }
    }
  }

  if (latestEvidenceTick !== null) {
    for (const record of evidence.traceRecords) {
      if (record.tick !== latestEvidenceTick) {
        continue;
      }

      if (record.type === 'cell-examined') {
        markCell(markers, record.cell.x, record.cell.y, 'evaluated-now');
      } else if (record.type === 'cell-blocked') {
        markCell(markers, record.cell.x, record.cell.y, 'blocked-rejected');
      } else if (record.type === 'cell-skipped' && record.reason === 'phase-not-selected') {
        markCell(markers, record.cell.x, record.cell.y, 'active-not-selected');
      } else if (
        record.type === 'cell-skipped' &&
        (record.reason === 'sleeping' || record.reason === 'inactive-sleeping')
      ) {
        markCell(markers, record.cell.x, record.cell.y, 'sleeping');
      }
    }
  }

  return Object.freeze({
    width: simulation.width,
    height: simulation.height,
    cells: simulation.cells,
    overlays: Object.freeze([...markers.values()]),
    chunks: Object.freeze(
      evidence.scheduler.chunks.map((chunk) =>
        Object.freeze({
          id: chunk.id,
          x: chunk.x,
          y: chunk.y,
          width: chunk.width,
          height: chunk.height,
          state: chunk.state,
          quietFrames: chunk.quietFrames,
          reason: chunk.reason,
        }),
      ),
    ),
    sampling,
    latestEvidenceTick,
  });
}

function summarizeRecord(record: TraceRecordV1): string {
  switch (record.type) {
    case 'phase-started':
      return `Phase ${record.phase + 1}/${record.phaseCount} started`;
    case 'phase-selection':
      return `Selected ${record.selectedCount}/${record.activeCount} cells (${record.pattern})`;
    case 'phase-completed':
      return `Phase ${record.phase + 1}/${record.phaseCount} completed`;
    case 'cell-examined':
      return `Examined cell ${record.cell.x},${record.cell.y}`;
    case 'cell-moved':
      return `Moved ${record.from.x},${record.from.y} → ${record.to.x},${record.to.y} (${record.reason})`;
    case 'cell-skipped':
      return `Skipped ${record.cell.x},${record.cell.y} (${record.reason})`;
    case 'cell-blocked':
      return `Blocked ${record.cell.x},${record.cell.y} (${record.reason})`;
    case 'chunk-activated':
      return `Activated chunk ${record.chunk.id} (${record.reason})`;
    case 'chunk-slept':
      return `Slept chunk ${record.chunk.id} (${record.reason})`;
    case 'chunk-woken': {
      const cause = record.causeChunk
        ? ` from chunk ${record.causeChunk.id}`
        : record.causeCell
          ? ` at cell ${record.causeCell.x},${record.causeCell.y}`
          : '';
      return `Woke chunk ${record.chunk.id} (${record.reason}${cause})`;
    }
  }
}

function buildRecentEvents(
  records: readonly TraceRecordV1[],
): readonly RecentTraceEventViewModel[] {
  return Object.freeze(
    records
      .slice(-8)
      .reverse()
      .map((record) =>
        Object.freeze({
          sequence: record.sequence,
          frame: record.frame,
          phase: record.phase,
          tick: record.tick,
          type: record.type,
          summary: summarizeRecord(record),
        }),
      ),
  );
}

export function buildAppPresentationViewModel(
  simulation: SimulationViewModel,
  evidence: PresentationEvidenceViewModelV1,
  registry: ParameterRegistry,
): AppPresentationViewModel {
  if (simulation.scenarioId !== evidence.simulation.scenarioId) {
    throw new Error('Simulation and evidence scenario identities do not match.');
  }

  return Object.freeze({
    simulation,
    world: buildWorld(simulation, evidence),
    legend: LEGEND,
    parameters: buildParameters(evidence, registry),
    metrics: evidence.metrics,
    provenance: evidence.provenance,
    traceRetention: evidence.traceRetention,
    recentEvents: buildRecentEvents(evidence.traceRecords),
  });
}
