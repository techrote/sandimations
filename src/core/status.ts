export interface CoreStatus {
  readonly name: 'sandimations-core';
  readonly deterministic: true;
  readonly stage: 'bootstrap';
}

export function createCoreStatus(): CoreStatus {
  return Object.freeze({
    name: 'sandimations-core',
    deterministic: true,
    stage: 'bootstrap',
  });
}
