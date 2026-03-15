import { type BaseObservable } from './observable';

function extendObservableWithIterator(
  ObservableClass: new <T>() => BaseObservable<T>
) {
  return class IteratorObservable<T> extends ObservableClass<T> {
    private sendToIterators?: (iteratorRes: IteratorResult<T>) => void;

    notify(data: T): void {
      super.notify(data);
      if (this.sendToIterators) {
        this.sendToIterators({ done: false, value: data });
      }
    }

    done(): void {
      super.done();
      if (this.sendToIterators) {
        this.sendToIterators({ done: true, value: undefined });
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
