import { describe, expect, it } from 'vitest';
import { Material } from '../../src/core/model/material';
import { createCoreParameterRegistry } from '../../src/core/parameters/registry';
import { SimulationRunner } from '../../src/core/runner/runner';
import {
  SCENARIO_SCHEMA_VERSION,
  normalizeScenario,
  type CoreScenario,
} from '../../src/core/scenario/scenario';
import { TRACE_PROTOCOL_VERSION } from '../../src/core/trace/protocol';

function tinyTraceScenario(blocked = false): CoreScenario {
  const width = 5;
  const height = 4;
  const cells = [
    Material.Wall,
    Material.Empty,
    Material.Empty,
    Material.Empty,
    Material.Wall,
    Material.Wall,
    Material.Empty,
    blocked ? Material.Empty : Material.Sand,
    Material.Empty,
    Material.Wall,
    Material.Wall,
    Material.Empty,
    blocked ? Material.Sand : Material.Empty,
    Material.Empty,
    Material.Wall,
    Material.Wall,
    Material.Wall,
    Material.Wall,
    Material.Wall,
    Material.Wall,
  ];

  return normalizeScenario({
    version: SCENARIO_SCHEMA_VERSION,
    id: blocked ? 'trace-blocked-golden' : 'trace-fall-golden',
    title: blocked ? 'Blocked trace golden' : 'Falling trace golden',
    seed: 1,
    simulation: { model: 'falling-sand-v1' },
    scheduler: { strategy: 'phase-clock-v1', phaseCount: 1 },
    world: { width, height, cells },
    parameters: createCoreParameterRegistry().defaults(),
    events: [],
    presentation: { defaultPlaybackRate: 1, showGrid: true },
  });
}

function traceSummary(runner: SimulationRunner): string[] {
  return runner.getTraceSnapshot().records.map((record) => {
    const prefix = `${record.sequence}:${record.type}@${record.frame}/${record.phase}/${record.tick}`;
    switch (record.type) {
      case 'cell-examined':
      case 'cell-skipped':
      case 'cell-blocked':
        return `${prefix}:${record.cell.x},${record.cell.y}${'reason' in record ? `:${record.reason}` : ''}`;
      case 'cell-moved':
        return `${prefix}:${record.from.x},${record.from.y}>${record.to.x},${record.to.y}:${record.reason}`;
      default:
        return prefix;
    }
  });
}

describe('trace protocol and teaching-model emission', () => {
  it('matches the golden one-grain trace with deterministic scan ordering', () => {
    const runner = new SimulationRunner(tinyTraceScenario());
    runner.stepFrame();

    expect(runner.getTraceSnapshot()).toMatchObject({
      version: TRACE_PROTOCOL_VERSION,
      provenance: {
        protocolVersion: TRACE_PROTOCOL_VERSION,
        backendId: 'sandimations-teaching-model-v1',
        backendKind: 'teaching-model',
        strategyId: 'phase-clock-v1',
        scenarioId: 'trace-fall-golden',
      },
    });
    expect(traceSummary(runner)).toEqual([
      '0:phase-started@0/0/0',
      '1:cell-examined@0/0/0:1,2',
      '2:cell-skipped@0/0/0:1,2:material-not-sand',
      '3:cell-examined@0/0/0:2,2',
      '4:cell-skipped@0/0/0:2,2:material-not-sand',
      '5:cell-examined@0/0/0:3,2',
      '6:cell-skipped@0/0/0:3,2:material-not-sand',
      '7:cell-examined@0/0/0:1,1',
      '8:cell-skipped@0/0/0:1,1:material-not-sand',
      '9:cell-examined@0/0/0:2,1',
      '10:cell-moved@0/0/0:2,1>2,2:fall',
      '11:cell-examined@0/0/0:3,1',
      '12:cell-skipped@0/0/0:3,1:material-not-sand',
      '13:cell-examined@0/0/0:1,0',
      '14:cell-skipped@0/0/0:1,0:material-not-sand',
      '15:cell-examined@0/0/0:2,0',
      '16:cell-skipped@0/0/0:2,0:material-not-sand',
      '17:cell-examined@0/0/0:3,0',
      '18:cell-skipped@0/0/0:3,0:material-not-sand',
      '19:phase-completed@0/0/0',
    ]);
  });

  it('records blocked cells distinctly from skipped cells', () => {
    const runner = new SimulationRunner(tinyTraceScenario(true));
    runner.stepFrame();

    const blocked = runner
      .getTraceSnapshot()
      .records.filter((record) => record.type === 'cell-blocked');
    expect(blocked).toEqual([
      expect.objectContaining({
        type: 'cell-blocked',
        cell: { x: 2, y: 2 },
        material: Material.Sand,
        reason: 'no-open-downward-target',
      }),
    ]);
  });

  it('clears and reproduces trace sequence exactly on deterministic reset/replay', () => {
    const runner = new SimulationRunner(tinyTraceScenario());
    runner.stepFrames(2);
    const first = runner.getTraceSnapshot();

    runner.reset();
    expect(runner.getTraceSnapshot().records).toEqual([]);
    runner.stepFrames(2);
    expect(runner.getTraceSnapshot()).toEqual(first);
  });
});
