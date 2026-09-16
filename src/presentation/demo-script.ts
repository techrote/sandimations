export interface PresentationCommandTarget {
  pause(): void;
  stepPhase(): void;
  stepFrame(): void;
  stepFrames(count: number): void;
  setSpeedPosition(position: number): void;
}

export type PresentationCommand =
  | Readonly<{ type: 'pause' }>
  | Readonly<{ type: 'step-phase' }>
  | Readonly<{ type: 'step-frame' }>
  | Readonly<{ type: 'step-frames'; count: number }>
  | Readonly<{ type: 'set-speed-position'; position: number }>
  | Readonly<{ type: 'set-view'; presentationMode: boolean }>;

export interface PresentationBeat {
  readonly id: string;
  readonly caption: string;
  readonly commands: readonly PresentationCommand[];
}

export const DEFAULT_PRESENTATION_SCRIPT: readonly PresentationBeat[] = Object.freeze([
  Object.freeze({
    id: 'focus',
    caption: 'Pause the deterministic runner and focus the explanatory view.',
    commands: Object.freeze([
      Object.freeze({ type: 'pause' as const }),
      Object.freeze({ type: 'set-view' as const, presentationMode: true }),
    ]),
  }),
  Object.freeze({
    id: 'phase-one',
    caption: 'Advance exactly one scheduler phase through the same public step command.',
    commands: Object.freeze([Object.freeze({ type: 'step-phase' as const })]),
  }),
  Object.freeze({
    id: 'phase-two',
    caption: 'Advance one more phase so the trace-backed timeline can show phase progression.',
    commands: Object.freeze([Object.freeze({ type: 'step-phase' as const })]),
  }),
  Object.freeze({
    id: 'frame',
    caption: 'Advance to the next logical frame without renderer-timing input.',
    commands: Object.freeze([Object.freeze({ type: 'step-frame' as const })]),
  }),
  Object.freeze({
    id: 'slow',
    caption: 'Set a slow presentation rate; simulation semantics remain fixed-step.',
    commands: Object.freeze([Object.freeze({ type: 'set-speed-position' as const, position: 30 })]),
  }),
]);

export function executePresentationBeat(
  target: PresentationCommandTarget,
  setPresentationMode: (enabled: boolean) => void,
  beat: PresentationBeat,
): void {
  for (const command of beat.commands) {
    switch (command.type) {
      case 'pause':
        target.pause();
        break;
      case 'step-phase':
        target.stepPhase();
        break;
      case 'step-frame':
        target.stepFrame();
        break;
      case 'step-frames':
        target.stepFrames(command.count);
        break;
      case 'set-speed-position':
        target.setSpeedPosition(command.position);
        break;
      case 'set-view':
        setPresentationMode(command.presentationMode);
        break;
    }
  }
}
