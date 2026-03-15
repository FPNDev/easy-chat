import { type BaseObservable } from './observable';

type Pipe<TIn, TOut> = (input: TIn) => TOut | Promise<TOut>;

type BivariantPipe<TIn, TOut> = {
  bivarianceHack(input: TIn): TOut | Promise<TOut>;
}['bivarianceHack'];

type PipesArray<T, POut> =
  | []
  | [Pipe<T, POut>]
  | [
      Pipe<T, unknown>,
      ...BivariantPipe<unknown, unknown>[],
      BivariantPipe<unknown, POut>
    ];

function joinPipes<PIn, POut>(pipes: PipesArray<PIn, POut>): Pipe<PIn, POut> {
  const pipesLen = pipes.length;

  if (pipesLen === 1) {
    return pipes[0] as Pipe<PIn, POut>;
  }

  return (input: unknown) => {
    let result: unknown = input;
    let pipeIdx = 0;

    while (pipeIdx < pipesLen) {
      const pipe = pipes[pipeIdx] as Pipe<unknown, unknown>;
      pipeIdx++;
      result = pipe(result);
      if (result instanceof Promise) {
        let promiseChain = result as Promise<unknown>;
        while (pipeIdx < pipesLen) {
          const nextPipe = pipes[pipeIdx] as Pipe<unknown, unknown>;
          pipeIdx++;
          promiseChain = promiseChain.then(nextPipe);
        }

        return promiseChain as Promise<POut>;
      }
    }

    return result as POut;
  };
}

function extendObservableWithPipes(
  ObservableClass: new <T>() => BaseObservable<T>
) {
  class PipedObservable<T> extends ObservableClass<T> {
    pipe(pipes: []): PipedObservable<T>;
    pipe<POut>(pipes: PipesArray<T, POut>): PipedObservable<POut>;
    pipe<POut>(
      pipes: PipesArray<T, POut> | []
    ): PipedObservable<POut> | PipedObservable<T> {
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
      });
      this.subscribeDone(() => {
        obs.done();
      });

      return obs;
    }
  }

  return PipedObservable;
}

export { joinPipes, extendObservableWithPipes };
export type { Pipe, PipesArray };
