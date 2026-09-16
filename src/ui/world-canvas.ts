import type {
  CellOverlayMarker,
  ChunkPresentationRegion,
  OverlayKind,
  SamplingPresentationState,
  WorldPresentationViewModel,
} from '../presentation/app-view-model';

const CELL_SIZE = 16;

export interface WorldRenderOptions {
  readonly enabledOverlays: ReadonlySet<OverlayKind>;
  readonly showGrid: boolean;
}

function drawOverlay(
  context: CanvasRenderingContext2D,
  marker: CellOverlayMarker,
  enabled: ReadonlySet<OverlayKind>,
): void {
  if (!enabled.has(marker.kind)) {
    return;
  }

  const left = marker.x * CELL_SIZE;
  const top = marker.y * CELL_SIZE;
  const inset = 2.5;
  context.save();
  context.lineWidth = 2;

  switch (marker.kind) {
    case 'evaluated-now':
      context.strokeStyle = '#f4e36b';
      context.strokeRect(left + inset, top + inset, CELL_SIZE - inset * 2, CELL_SIZE - inset * 2);
      context.fillStyle = '#f4e36b';
      context.beginPath();
      context.arc(left + CELL_SIZE / 2, top + CELL_SIZE / 2, 1.75, 0, Math.PI * 2);
      context.fill();
      break;
    case 'active-not-selected':
      context.strokeStyle = 'rgba(128, 215, 229, 0.48)';
      context.lineWidth = 1.25;
      context.beginPath();
      context.moveTo(left + 4, top + CELL_SIZE - 4);
      context.lineTo(left + CELL_SIZE - 4, top + 4);
      context.stroke();
      break;
    case 'sleeping':
      context.strokeStyle = '#b8b9b1';
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(left + 3, top + CELL_SIZE - 3);
      context.lineTo(left + CELL_SIZE - 3, top + 3);
      context.moveTo(left + 3, top + 3);
      context.lineTo(left + CELL_SIZE - 3, top + CELL_SIZE - 3);
      context.stroke();
      break;
    case 'newly-woken':
      context.strokeStyle = '#82e09d';
      context.strokeRect(left + 1.5, top + 1.5, CELL_SIZE - 3, CELL_SIZE - 3);
      context.strokeRect(left + 4.5, top + 4.5, CELL_SIZE - 9, CELL_SIZE - 9);
      break;
    case 'blocked-rejected':
      context.strokeStyle = '#f5a39a';
      context.beginPath();
      context.moveTo(left + 3, top + 3);
      context.lineTo(left + CELL_SIZE - 3, top + CELL_SIZE - 3);
      context.moveTo(left + CELL_SIZE - 3, top + 3);
      context.lineTo(left + 3, top + CELL_SIZE - 3);
      context.stroke();
      break;
  }
  context.restore();
}

function drawChunkBoundary(
  context: CanvasRenderingContext2D,
  chunk: ChunkPresentationRegion,
): void {
  const x = chunk.x * CELL_SIZE + 1;
  const y = chunk.y * CELL_SIZE + 1;
  const width = chunk.width * CELL_SIZE - 2;
  const height = chunk.height * CELL_SIZE - 2;

  context.save();
  context.lineWidth = chunk.state === 'newly-woken' ? 3 : 2;
  if (chunk.state === 'sleeping') {
    context.strokeStyle = 'rgba(215, 218, 208, 0.8)';
    context.setLineDash([5, 5]);
  } else if (chunk.state === 'pending-sleep') {
    context.strokeStyle = 'rgba(244, 227, 107, 0.72)';
    context.setLineDash([9, 4]);
  } else if (chunk.state === 'newly-woken') {
    context.strokeStyle = 'rgba(130, 224, 157, 0.95)';
    context.setLineDash([]);
  } else {
    context.strokeStyle = 'rgba(128, 215, 229, 0.48)';
    context.setLineDash([]);
  }
  context.strokeRect(x, y, width, height);
  context.restore();
}

function drawSamplingCoverage(
  context: CanvasRenderingContext2D,
  sampling: SamplingPresentationState,
): void {
  if (sampling.lastExecutedTick === null) {
    return;
  }

  context.save();
  for (const cell of sampling.cells) {
    if (cell.lastSelectedTick === null) {
      continue;
    }
    const age = sampling.lastExecutedTick - cell.lastSelectedTick;
    if (age < 0 || age >= sampling.phaseCount) {
      continue;
    }
    const alpha = Math.max(0.025, 0.17 - age * (0.12 / Math.max(1, sampling.phaseCount - 1)));
    context.fillStyle = `rgba(128, 215, 229, ${alpha})`;
    context.fillRect(cell.x * CELL_SIZE + 1, cell.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);

    const phasePosition =
      sampling.phaseCount <= 1
        ? 0
        : Math.round((cell.assignedPhase / (sampling.phaseCount - 1)) * (CELL_SIZE - 6));
    context.fillStyle = 'rgba(233, 236, 225, 0.32)';
    context.fillRect(
      cell.x * CELL_SIZE + 2 + phasePosition,
      cell.y * CELL_SIZE + CELL_SIZE - 3,
      2,
      1,
    );
  }
  context.restore();
}

export function renderWorld(
  canvas: HTMLCanvasElement,
  view: WorldPresentationViewModel,
  options: WorldRenderOptions,
): void {
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
      if (cell !== 'empty' && cell !== undefined) {
        context.fillStyle = cell === 'sand' ? '#d4ad62' : '#72776c';
        context.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }

      if (options.showGrid) {
        context.strokeStyle = 'rgba(233, 236, 225, 0.09)';
        context.lineWidth = 1;
        context.strokeRect(x * CELL_SIZE + 0.5, y * CELL_SIZE + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
      }
    }
  }

  if (view.sampling !== null) {
    drawSamplingCoverage(context, view.sampling);
  }

  for (const chunk of view.chunks) {
    drawChunkBoundary(context, chunk);
  }

  for (const marker of view.overlays) {
    drawOverlay(context, marker, options.enabledOverlays);
  }
}
