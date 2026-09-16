import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_BACKEND_ADAPTER_VERSION,
  TeachingModelEvidenceBackendV1,
  type BackendEvidenceSnapshotV1,
  type EvidenceBackendV1,
} from '../../src/adapters/evidence-backend';
import { Material } from '../../src/core/model/material';
import { SimulationRunner } from '../../src/core/runner/runner';
import { createDefaultScenario } from '../../src/core/scenario/scenario';
import {
  DEFAULT_PRESENTATION_TRACE_RECORDS,
  PresentationEvidenceAdapterV1,
} from '../../src/presentation/evidence-adapter';

function mockBackendSnapshot(): BackendEvidenceSnapshotV1 {
  const runner = new SimulationRunner(createDefaultScenario(1234));
  runner.stepFrame();
  return new TeachingModelEvidenceBackendV1(runner).readEvidence();
}

class StaticBackend implements EvidenceBackendV1 {
  public readonly adapterVersion = EVIDENCE_BACKEND_ADAPTER_VERSION;

  public constructor(private readonly snapshot: BackendEvidenceSnapshotV1) {}

  public readEvidence(): BackendEvidenceSnapshotV1 {
    return this.snapshot;
  }
}

describe('backend and presentation evidence adapters', () => {
  it('exposes teaching-model simulation, scheduler, trace, metrics, and provenance without DOM state', () => {
    const runner = new SimulationRunner(createDefaultScenario(0x0badc0de));
    runner.stepFrame();
    const backend = new TeachingModelEvidenceBackendV1(runner);
    const snapshot = backend.readEvidence();

    expect(snapshot.version).toBe(EVIDENCE_BACKEND_ADAPTER_VERSION);
    expect(snapshot.provenance).toEqual({
      protocolVersion: 1,
      backendId: 'sandimations-teaching-model-v1',
      backendKind: 'teaching-model',
      strategyId: 'phase-clock-v1',
      scenarioId: 'sd-002-falling-sand',
    });
    expect(snapshot.simulation).toMatchObject({
      scenarioId: 'sd-002-falling-sand',
      seed: 0x0badc0de,
      frame: 1,
      tick: 1,
      stateHash: runner.getStateHash(),
    });
    expect(snapshot.scheduler).toEqual({
      strategyId: 'phase-clock-v1',
      frame: 1,
      nextPhase: 0,
      tick: 1,
      phaseCount: 1,
      chunks: [],
      sampling: null,
    });
    expect(snapshot.trace.records.length).toBeGreaterThan(2);
    expect(snapshot.metrics.cells.examined).toBeGreaterThan(0);
    expect(typeof document).toBe('undefined');
  });

  it('lets the presentation adapter consume teaching or mock backends through one contract', () => {
    const runner = new SimulationRunner(createDefaultScenario());
    runner.stepFrames(2);
    const teaching = new TeachingModelEvidenceBackendV1(runner);
    const teachingView = new PresentationEvidenceAdapterV1(teaching).read();

    const mockSnapshot = mockBackendSnapshot();
    const mockView = new PresentationEvidenceAdapterV1(new StaticBackend(mockSnapshot)).read();

    expect(teachingView.provenance.backendKind).toBe('teaching-model');
    expect(teachingView.traceRecords).toEqual(
      teaching.readEvidence().trace.records.slice(-DEFAULT_PRESENTATION_TRACE_RECORDS),
    );
    expect(mockView.simulation.scenarioId).toBe(mockSnapshot.simulation.scenarioId);
    expect(mockView.metrics).toEqual(mockSnapshot.metrics);
  });

  it('prefers the bounded presentation read path when a backend provides it', () => {
    const runner = new SimulationRunner(createDefaultScenario());
    runner.stepFrames(20);
    const backend = new TeachingModelEvidenceBackendV1(runner);
    const view = new PresentationEvidenceAdapterV1(backend).read(7);

    expect(view.traceRecords).toHaveLength(7);
    expect(view.traceRetention.retainedRecords).toBeGreaterThanOrEqual(7);
    expect(view.traceRetention.windowFirstSequence).toBe(view.traceRecords[0]?.sequence);
    expect(view.traceRetention.nextSequence).toBe(runner.getTraceSnapshot().nextSequence);
  });

  it('keeps trace and metrics identical despite extra presentation/backend reads between steps', () => {
    const scenario = createDefaultScenario(0x0ddc0ffe);
    const observed = new SimulationRunner(scenario);
    const control = new SimulationRunner(scenario);
    const backend = new TeachingModelEvidenceBackendV1(observed);
    const presentation = new PresentationEvidenceAdapterV1(backend);

    for (let frame = 0; frame < 10; frame += 1) {
      for (let read = 0; read < 23; read += 1) {
        backend.readEvidence();
        presentation.read();
      }
      observed.stepFrame();
      control.stepFrame();
    }

    expect(observed.getStateHash()).toBe(control.getStateHash());
    expect(observed.getTraceSnapshot()).toEqual(control.getTraceSnapshot());
    expect(observed.getMetricsSnapshot()).toEqual(control.getMetricsSnapshot());
  });
});