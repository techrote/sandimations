export const NORMAL_SPEED_POSITION = 50;
export const MIN_SPEED_POSITION = 0;
export const MAX_SPEED_POSITION = 100;

function clampPosition(position: number): number {
  if (!Number.isFinite(position)) {
    return NORMAL_SPEED_POSITION;
  }
  return Math.min(MAX_SPEED_POSITION, Math.max(MIN_SPEED_POSITION, position));
}

export function speedPositionToRate(position: number): number {
  const clamped = clampPosition(position);
  if (clamped <= NORMAL_SPEED_POSITION) {
    return 2 ** ((clamped - NORMAL_SPEED_POSITION) / 10);
  }
  return 2 ** ((clamped - NORMAL_SPEED_POSITION) / 12.5);
}

export function rateToSpeedPosition(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) {
    return NORMAL_SPEED_POSITION;
  }
  const position =
    rate <= 1
      ? NORMAL_SPEED_POSITION + Math.log2(rate) * 10
      : NORMAL_SPEED_POSITION + Math.log2(rate) * 12.5;
  return clampPosition(position);
}

function trimRate(value: string): string {
  return value.replace(/0+$/, '').replace(/\.$/, '');
}

export function formatPlaybackRate(rate: number): string {
  if (rate >= 1) {
    return `${Number.isInteger(rate) ? rate.toFixed(0) : trimRate(rate.toFixed(2))}×`;
  }
  return `${trimRate(rate.toFixed(3))}×`;
}
