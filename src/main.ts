import './styles.css';
import { createCoreStatus } from './core/status';
import { createBootstrapViewModel } from './presentation/bootstrap-view-model';
import { mountApp } from './ui/app';

const root = document.querySelector<HTMLElement>('#app');

if (root === null) {
  throw new Error('Sandimations app root was not found.');
}

const coreStatus = createCoreStatus();
const viewModel = createBootstrapViewModel(coreStatus);
mountApp(root, viewModel);
