import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_BACKEND_ADAPTER_VERSION,
  TeachingModelEvidenceBackendV1,
  type BackendEvidenceSnapshotV1,
  type BackendPresentationEvidenceSnapshotV1,
  type EvidenceBackendV1,
} from '../../src/adapters/evidence-backend';
import { SimulationRunner } from '../../src/core/runner/runner';
import { createDefaultScenario } from '../../src/core/scenario/scenario';
import {
  DEFAULT_PRESENTATION_TRACE_RECORDS,
  PresentationEvidenceAdapterV1,
} from '../../src/presentation/evidence-adapter';

class SnapshotEvidenceBackend implements EvidenceBackendV1 {
  public readonly adapterVersion = EVIDENCE_BACKEND_ADAPTER_VERSION;

  public constructor(private readonly snapshot: BackendEvidenceSnapshotV1) {}

  public readEvidence(): BackendEvidenceSnapshotV1 {
    return this.snapshot;
  }
}

class PresentationWindowBackend implements EvidenceBackendV1 {
  public readonly adapterVersion = EVIDENCE_BACKEND_ADAPTER_VERSION;
  public fullReads = 0;
  public windowReads = 0;

  public constructor(
    private readonly full: BackendEvidenceSnapshotV1,
    private readonly window: BackendPresentationEvidenceSnapshotV1,
  ) {}

  public readEvidence(): BackendEvidenceSnapshotV1 {
    this.fullReads += 1;
    return this.full;
  }

  public readPresentationEvidence(): BackendPresentationEvidenceSnapshotV1 {
    this.windowReads += 1;
    return this.window;
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
    });
    expect(snapshot.trace.records.length).toBeGreaterThan(2);
    expect(snapshot.metrics.cells.examined).toBeGreaterThan(0);
    expect(typeof document).toBe('undefined');
  });

  it('lets the presentation adapter consume teaching or mock backends through one contract', () => {
    const runner = new SimulationRunner(createDefaultScenario());
    runner.stepFrames(2);
    const teaching = new TeachingModelEvidenceBackendV1(runner);
    const canonical = teaching.readEvidence();

    const teachingView = new PresentationEvidenceAdapterV1(teaching).read();
    const mockView = new PresentationEvidenceAdapterV1(
      new SnapshotEvidenceBackend(canonical),
    ).read();

    expect(mockView).toEqual(teachingView);
    expect(mockView.traceRecords).toEqual(
      canonical.trace.records.slice(-DEFAULT_PRESENTATION_TRACE_RECORDS),
    );
    expect(mockView.traceRetention.retainedRecords).toBe(canonical.trace.records.length);
    expect(mockView.metrics).toEqual(canonical.metrics);
  });

  it('prefers the bounded presentation read path when a backend provides it', () => {
    const runner = new SimulationRunner(createDefaultScenario());
    runner.stepFrames(2);
    const teaching = new TeachingModelEvidenceBackendV1(runner);
    const backend = new PresentationWindowBackend(
      teaching.readEvidence(),
      teaching.readPresentationEvidence(32),
    );
    const adapter = new PresentationEvidenceAdapterV1(backend);

    const view = adapter.read(32);

    expect(view.traceRecords).toHaveLength(32);
    expect(backend.windowReads).toBe(1);
    expect(backend.fullReads).toBe(0);
  });

  it('keeps trace and metrics identical despite extra presentation/backend reads between steps', () => {
    const directRunner = new SimulationRunner(createDefaultScenario(0x12345678));
    const observedRunner = new SimulationRunner(createDefaultScenario(0x12345678));
    const observed = new PresentationEvidenceAdapterV1(
      new TeachingModelEvidenceBackendV1(observedRunner),
    );

    for (let frame = 0; frame < 6; frame += 1) {
      directRunner.stepFrame();
      for (let read = 0; read < 23; read += 1) {
        observed.read();
      }
      observedRunner.stepFrame();
    }

    expect(observedRunner.getStateHash()).toBe(directRunner.getStateHash());
    expect(observedRunner.getTraceSnapshot()).toEqual(directRunner.getTraceSnapshot());
    expect(observedRunner.getMetricsSnapshot()).toEqual(directRunner.getMetricsSnapshot());
  });
});
