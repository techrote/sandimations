import './styles.css';
import { SimulationRunner } from './core/runner/runner';
import { createDefaultScenario } from './core/scenario/scenario';
import { SimulationController } from './presentation/simulation-controller';
import { mountApp } from './ui/app';

const root = document.querySelector<HTMLElement>('#app');

if (root === null) {
  throw new Error('Sandimations app root was not found.');
}

const runner = new SimulationRunner(createDefaultScenario());
runner.play();
const controller = new SimulationController(runner);
mountApp(root, controller);
