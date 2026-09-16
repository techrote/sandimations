import './styles.css';
import './comparison.css';
import './scenario-experience.css';
import { createCoreParameterRegistry } from './core/parameters/registry';
import { mountScenarioExperience } from './ui/scenario-experience';

const root = document.querySelector<HTMLElement>('#app');

if (root === null) {
  throw new Error('Sandimations app root was not found.');
}

mountScenarioExperience(root, createCoreParameterRegistry());
