import { BaseObservable } from "./observable";
import type { PipesArray } from "./pipes";

class PipedObservable<T> extends BaseObservable<T> {
  pipe(pipes: []): PipedObservable<T>;
  pipe<POut>(pipes: PipesArray<T, POut>): PipedObservable<POut>;
  pipe<POut>(
    pipes: PipesArray<T, POut> | []
  ): PipedObservable<POut> {
    if (pipes.length === 0 || this.closed) {
      return this;
    }
    const joinedPipe = joinPipes(pipes);
    const obs = new PipedObservable<POut>();
    this.subscribe((data: T) => {
      const result = joinedPipe(data);
      if (result instanceof Promise) {
        result.then((resolved) => {
          if (!this.closed) {
            obs.notify(resolved as POut);
          }
        });
      } else {
        obs.notify(result as POut);
      }
    }
  }