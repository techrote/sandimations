import type { BootstrapViewModel } from '../presentation/bootstrap-view-model';

function makeList(items: readonly string[]): HTMLUListElement {
  const list = document.createElement('ul');
  list.className = 'boundary-list';

  for (const item of items) {
    const entry = document.createElement('li');
    entry.textContent = item;
    list.append(entry);
  }

  return list;
}

export function mountApp(root: HTMLElement, view: BootstrapViewModel): void {
  const main = document.createElement('main');
  main.className = 'app-shell';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'SD-001 substrate';

  const heading = document.createElement('h1');
  heading.textContent = view.title;

  const summary = document.createElement('p');
  summary.className = 'summary';
  summary.textContent = view.summary;

  const status = document.createElement('p');
  status.className = 'status';
  status.dataset.testid = 'core-status';
  status.textContent = view.coreStatus;

  const section = document.createElement('section');
  section.setAttribute('aria-labelledby', 'boundaries-heading');

  const boundariesHeading = document.createElement('h2');
  boundariesHeading.id = 'boundaries-heading';
  boundariesHeading.textContent = 'Architecture boundaries';

  section.append(boundariesHeading, makeList(view.boundaries));
  main.append(eyebrow, heading, summary, status, section);
  root.replaceChildren(main);
}
