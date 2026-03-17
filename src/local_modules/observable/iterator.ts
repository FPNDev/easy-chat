import { type BaseObservable } from './observable';

function extendObservableWithIterator(
  ObservableClass: new <T, D = void>() => BaseObservable<T, D>
) {
  return class IteratorObservable<T, D> extends ObservableClass<T, D> {
    private sendToIterators?: (iteratorRes: IteratorResult<T, D>) => void;

    notify(data: T): void {
      super.notify(data);
      if (this.sendToIterators) {
        this.sendToIterators({ done: false, value: data });
      }
    }

    done(doneValue: D): void {
      super.done(doneValue);
      if (this.sendToIterators) {
        this.sendToIterators({ done: true, value: doneValue });
      }
    }

    [Symbol.asyncIterator](): {
      next(): Promise<IteratorResult<T>>;
    } {
      const iterator = this.createAsyncIterator();
      return iterator;
    }

    private createAsyncIterator(): {
      next(): Promise<IteratorResult<T>>;
    } {
      return {
        next: (): Promise<IteratorResult<T>> => {
          if (this.closed) {
            return Promise.resolve({ done: true, value: undefined });
          }

          return new Promise((resolve) => {
            const sendToPreviousIterators = this.sendToIterators;
            this.sendToIterators = (iteratorRes: IteratorResult<T>) => {
              resolve(iteratorRes);
              if (sendToPreviousIterators) {
                sendToPreviousIterators(iteratorRes);
              }
            };
          });
        },
      };
    }
  }
}
export { extendObservableWithIterator };
