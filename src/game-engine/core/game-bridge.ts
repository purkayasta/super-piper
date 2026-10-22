import type { GameCommand, GameEvent } from './game-events';

type Handler<T> = (message: T) => void;

export class GameBridge {
  private readonly commandHandlers = new Set<Handler<GameCommand>>();
  private readonly eventHandlers = new Set<Handler<GameEvent>>();
  private disposed = false;

  send(command: GameCommand): void {
    if (this.disposed) return;
    this.deliver(this.commandHandlers, command);
  }

  onCommand(handler: Handler<GameCommand>): () => void {
    return this.subscribe(this.commandHandlers, handler);
  }

  emit(event: GameEvent): void {
    if (this.disposed) return;
    this.deliver(this.eventHandlers, event);
  }

  onEvent(handler: Handler<GameEvent>): () => void {
    return this.subscribe(this.eventHandlers, handler);
  }

  listenerCount(): number {
    return this.commandHandlers.size + this.eventHandlers.size;
  }

  dispose(): void {
    this.disposed = true;
    this.commandHandlers.clear();
    this.eventHandlers.clear();
  }

  private subscribe<T>(handlers: Set<Handler<T>>, handler: Handler<T>): () => void {
    if (this.disposed) return () => {};
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  }

  private deliver<T>(handlers: Set<Handler<T>>, message: T): void {
    for (const handler of handlers) {
      try {
        handler(message);
      } catch (error) {
        console.error('GameBridge handler failed', error);
      }
    }
  }
}
