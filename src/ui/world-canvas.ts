import type { SimulationViewModel } from '../presentation/simulation-controller';

const CELL_SIZE = 14;

export function renderWorld(canvas: HTMLCanvasElement, view: SimulationViewModel): void {
  const width = view.width * CELL_SIZE;
  const height = view.height * CELL_SIZE;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const context = canvas.getContext('2d');
  if (context === null) {
    throw new Error('2D canvas context is unavailable.');
  }

  context.fillStyle = '#11130f';
  context.fillRect(0, 0, width, height);

  for (let y = 0; y < view.height; y += 1) {
    for (let x = 0; x < view.width; x += 1) {
      const cell = view.cells[y * view.width + x];
      if (cell === 'empty' || cell === undefined) {
        continue;
      }

      context.fillStyle = cell === 'sand' ? '#d4ad62' : '#72776c';
      context.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }
}
