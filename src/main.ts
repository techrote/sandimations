import './styles.css';
import { TeachingModelEvidenceBackendV1 } from './adapters/evidence-backend';
import { createCoreParameterRegistry } from './core/parameters/registry';
import { SimulationRunner } from './core/runner/runner';
import { createDefaultScenario } from './core/scenario/scenario';
import { PresentationEvidenceAdapterV1 } from './presentation/evidence-adapter';
import { SimulationController } from './presentation/simulation-controller';
import { mountApp } from './ui/app';

const root = document.querySelector<HTMLElement>('#app');

if (root === null) {
  throw new Error('Sandimations app root was not found.');
}

const registry = createCoreParameterRegistry();
const runner = new SimulationRunner(createDefaultScenario(), registry);
runner.play();
const controller = new SimulationController(runner);
const evidence = new PresentationEvidenceAdapterV1(new TeachingModelEvidenceBackendV1(runner));
mountApp(root, controller, evidence, registry);
