import { describe, expect, it } from 'vitest';
import { EvidenceRecorderV1 } from '../../src/core/evidence/recorder';
import { METRICS_SCHEMA_VERSION } from '../../src/core/metrics/metrics';
import { Material } from '../../src/core/model/material';
import {
  TRACE_PROTOCOL_VERSION,
  createEvidenceProvenanceV1,
  type TraceContextV1,
} from '../../src/core/trace/protocol';

const provenance = createEvidenceProvenanceV1({
  backendId: 'metrics-test-backend',
  backendKind: 'teaching-model',
  strategyId: 'metrics-test-strategy',
  scenarioId: 'metrics-test-scenario',
});
const context: TraceContextV1 = Object.freeze({ frame: 2, phase: 1, tick: 7 });

describe('trace-derived deterministic metrics', () => {
  it('counts cell work and chunk state transitions from the same trace records', () => {
    const recorder = new EvidenceRecorderV1(provenance);
    recorder.record(context, { type: 'phase-started', phaseCount: 4 });
    recorder.record(context, {
      type: 'cell-examined',
      cell: { x: 3, y: 4 },
      material: Material.Sand,
    });
    recorder.record(context, {
      type: 'cell-blocked',
      cell: { x: 3, y: 4 },
      material: Material.Sand,
      reason: 'fixture-blocked',
    });
    recorder.record(context, {
      type: 'chunk-activated',
      chunk: { id: '0:0', x: 0, y: 0 },
      reason: 'scenario-initialization',
    });
    recorder.record(context, {
      type: 'chunk-slept',
      chunk: { id: '0:0', x: 0, y: 0 },
      reason: 'stability-threshold',
    });
    recorder.record(context, {
      type: 'chunk-woken',
      chunk: { id: '0:0', x: 0, y: 0 },
      reason: 'local-disturbance',
    });
    recorder.record(context, { type: 'phase-completed', phaseCount: 4 });

    expect(recorder.getMetricsSnapshot()).toEqual({
      version: METRICS_SCHEMA_VERSION,
      provenance,
      cells: { examined: 1, moved: 0, skipped: 0, blocked: 1 },
      chunks: { active: 1, sleeping: 0, activated: 1, slept: 1, woken: 1 },
      phases: {
        started: 1,
        completed: 1,
        lastCompleted: { frame: 2, phase: 1, tick: 7 },
      },
      work: {
        cellEvaluations: 1,
        schedulerTransitions: 3,
        total: 4,
      },
    });
  });

  it('keeps trace and metrics provenance aligned and resets both together', () => {
    const recorder = new EvidenceRecorderV1(provenance);
    recorder.record(context, { type: 'phase-started', phaseCount: 4 });

    expect(recorder.getTraceSnapshot()).toMatchObject({
      version: TRACE_PROTOCOL_VERSION,
      provenance,
    });
    expect(recorder.getMetricsSnapshot()).toMatchObject({
      version: METRICS_SCHEMA_VERSION,
      provenance,
    });

    const replacement = createEvidenceProvenanceV1({
      backendId: 'replacement-backend',
      backendKind: 'recorded-trace',
      strategyId: 'replacement-strategy',
      scenarioId: 'replacement-scenario',
    });
    recorder.reset(replacement);

    expect(recorder.getTraceSnapshot()).toEqual({
      version: TRACE_PROTOCOL_VERSION,
      provenance: replacement,
      records: [],
    });
    expect(recorder.getMetricsSnapshot()).toEqual({
      version: METRICS_SCHEMA_VERSION,
      provenance: replacement,
      cells: { examined: 0, moved: 0, skipped: 0, blocked: 0 },
      chunks: { active: 0, sleeping: 0, activated: 0, slept: 0, woken: 0 },
      phases: { started: 0, completed: 0, lastCompleted: null },
      work: { cellEvaluations: 0, schedulerTransitions: 0, total: 0 },
    });
  });
});
