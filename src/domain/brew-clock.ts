import type { BrewSession, Preparation, StepExecution } from './preparation';

/** Monotonic while active. Wall time is used only across suspension or recovery. */
export class BrewClock {
  private anchor: number;
  private lastTick: number;
  private hiddenAt?: { mono: number; wall: number };
  private foreground = true;
  constructor(private state: BrewSession, mono: number) { this.state = structuredClone(state); this.anchor = mono; this.lastTick = mono; }
  read(mono: number, wall: number): BrewSession {
    return { ...this.state, elapsedMs: this.state.elapsedMs + (this.state.status === 'running' ? (this.hiddenAt ? Math.max(0, mono - this.hiddenAt.mono, wall - this.hiddenAt.wall) : Math.max(0, mono - this.anchor)) : 0), checkpointAt: new Date(wall).toISOString() };
  }
  private commit(state: BrewSession, mono: number) { this.state = state; this.anchor = mono; this.lastTick = mono; }
  private due(session: BrewSession) { const step = session.snapshot.recipe.steps[session.stepIndex]; return step.advance === 'time' && session.elapsedMs - session.stepStartedMs >= step.durationSeconds! * 1000; }
  tick(mono: number, wall: number): { session: BrewSession; transitioned: boolean } {
    let current = this.read(mono, wall); let transitioned = false;
    if (this.foreground && current.status === 'running' && !current.needsConfirmation && this.due(current)) {
      if (mono - this.lastTick > 2000 || current.stepIndex === current.snapshot.recipe.steps.length - 1) {
        current = { ...current, needsConfirmation: true }; this.commit(current, mono);
      } else { this.next(mono, wall, 'automatic'); current = this.read(mono, wall); transitioned = true; }
    }
    this.lastTick = mono;
    return { session: current, transitioned };
  }
  pause(mono: number, wall: number) { this.commit({ ...this.read(mono, wall), status: 'paused' }, mono); if (!this.foreground) this.hiddenAt = { mono, wall }; }
  resume(mono: number, wall: number) { this.commit({ ...this.read(mono, wall), status: 'running' }, mono); if (!this.foreground) this.hiddenAt = { mono, wall }; }
  next(mono: number, wall: number, exit: 'manual' | 'automatic' = 'manual') { this.move(1, mono, wall, exit); }
  previous(mono: number, wall: number) { this.move(-1, mono, wall, 'previous'); }
  private move(direction: number, mono: number, wall: number, exit: 'manual' | 'automatic' | 'previous') {
    const session = this.read(mono, wall); const index = session.stepIndex + direction;
    if (index < 0 || index >= session.snapshot.recipe.steps.length) return;
    const executions = session.executions.map((e, i) => i === session.executions.length - 1 ? { ...e, leftMs: session.elapsedMs, exit } : e);
    executions.push({ id: crypto.randomUUID(), stepId: session.snapshot.recipe.steps[index].id, enteredMs: session.elapsedMs });
    this.commit({ ...session, stepIndex: index, stepStartedMs: session.elapsedMs, executions, needsConfirmation: false }, mono);
  }
  suspend(mono: number, wall: number) {
    if (!this.foreground) return;
    this.commit(this.read(mono, wall), mono); this.hiddenAt = { mono, wall }; this.foreground = false;
  }
  returnToForeground(mono: number, wall: number) {
    if (this.foreground) return;
    const elapsed = this.state.status === 'running' && this.hiddenAt ? Math.max(0, mono - this.hiddenAt.mono, wall - this.hiddenAt.wall) : 0;
    const session = { ...this.state, elapsedMs: this.state.elapsedMs + elapsed, checkpointAt: new Date(wall).toISOString() };
    if (this.due(session)) session.needsConfirmation = true;
    this.commit(session, mono); this.hiddenAt = undefined; this.foreground = true;
  }
  static recover(checkpoint: BrewSession, mono: number, wall: number) {
    const extra = checkpoint.status === 'running' ? Math.max(0, wall - Date.parse(checkpoint.checkpointAt)) : 0;
    const clock = new BrewClock({ ...checkpoint, elapsedMs: checkpoint.elapsedMs + extra, status: 'paused', checkpointAt: new Date(wall).toISOString() }, mono);
    if (clock.due(clock.state)) clock.state.needsConfirmation = true;
    return clock;
  }
  preparation(state: Preparation['state'], notes: string, consumeInterrupted: boolean, mono: number, wall: number): Preparation {
    const session = this.read(mono, wall);
    const executions: StepExecution[] = session.executions.map((e, i) => i === session.executions.length - 1 ? { ...e, leftMs: session.elapsedMs, exit: state } : e);
    return { id: session.id, createdAt: session.createdAt, updatedAt: new Date(wall).toISOString(), snapshot: structuredClone(session.snapshot), startedAt: session.startedAt, finishedAt: new Date(wall).toISOString(), elapsedMs: session.elapsedMs, executions, state, notes: notes.trim() || undefined, consumedGrams: session.snapshot.packet && (state === 'completed' || consumeInterrupted) ? session.snapshot.recipe.dose : 0 };
  }
}
