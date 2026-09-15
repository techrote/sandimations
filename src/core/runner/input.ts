import type { Material } from '../model/material';

export interface SetCellInput {
  readonly type: 'set-cell';
  readonly x: number;
  readonly y: number;
  readonly material: Material;
}

export type RunnerInput = SetCellInput;
