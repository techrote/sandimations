import './styles.css';
import './comparison.css';
import { TeachingModelEvidenceBackendV1 } from './adapters/evidence-backend';
import { DeterministicComparison } from './core/comparison/comparison';
import { createCoreParameterRegistry } from './core/parameters/registry';
import { SimulationRunner } from './core/runner/runner';
import {
  createPhasedSamplingFixtureScenario,
  createPhasedSamplingNormalScenario,
  createSleepWakeFixtureScenario,
} from './core/scenario/scenario';
import { ComparisonController } from './presentation/comparison-controller';
import { PresentationEvidenceAdapterV1 } from './presentation/evidence-adapter';
import { SimulationController } from './presentation/simulation-controller';
import { mountApp } from './ui/app';
import { mountComparisonApp } from './ui/comparison-app';

const root = document.querySelector<HTMLElement>('#app');

if (root === null) {
  throw new Error('Sandimations app root was not found.');
}

const demo = new URLSearchParams(window.location.search).get('scenario');
const registry = createCoreParameterRegistry();

if (demo === 'compare-sleep-wake' || demo === 'compare-phased') {
  const scenario =
    demo === 'compare-sleep-wake'
      ? createSleepWakeFixtureScenario()
      : createPhasedSamplingFixtureScenario();
  const comparison = new DeterministicComparison(scenario, registry);
  comparison.play();
  const controller = new ComparisonController(comparison);
  const baselineEvidence = new PresentationEvidenceAdapterV1(
    new TeachingModelEvidenceBackendV1(comparison.getBaselineRunner()),
  );
  const optimizedEvidence = new PresentationEvidenceAdapterV1(
    new TeachingModelEvidenceBackendV1(comparison.getOptimizedRunner()),
  );
  mountComparisonApp(root, controller, baselineEvidence, optimizedEvidence, registry);
} else {
  const scenario =
    demo === 'chunk-sleep-wake'
      ? createSleepWakeFixtureScenario()
      : demo === 'phased-normal'
        ? createPhasedSamplingNormalScenario()
        : createPhasedSamplingFixtureScenario();

  const runner = new SimulationRunner(scenario, registry);
  runner.setPlaybackRate(scenario.presentation.defaultPlaybackRate);
  runner.play();
  const controller = new SimulationController(runner);
  const evidence = new PresentationEvidenceAdapterV1(new TeachingModelEvidenceBackendV1(runner));
  mountApp(root, controller, evidence, registry);
}
