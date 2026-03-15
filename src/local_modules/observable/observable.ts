import { extendObservableWithIterator } from './iterator';
import { extendObservableWithPipes, type PipesArray } from './pipes';

type Observer<T> = (data: T) => void;

class BaseObservable<T> {
  private observers: Observer<T>[] = [];
  private doneObservers: Observer<void>[] = [];
  private open = true;

  private lastValue: T | undefined;
  private saveValue?: boolean;

  get value() {
    return this.lastValue;
  }

  constructor(saveValue?: boolean) {
    this.saveValue = saveValue;
  }

  get closed() {
    return !this.open;
  }

  subscribe(observer: Observer<T>) {
    let subscribed: boolean | undefined;
    if (this.open) {
      subscribed = true;
      this.observers.push(observer);
    }

    return () => {
      if (subscribed) {
        this.observers.splice(this.observers.indexOf(observer), 1);
        subscribed = undefined;
      }
    };
  }
  notify(data: T) {
    if (!this.open) {
      return;
    }

    if (this.saveValue) {
      this.lastValue = data;
    }

    for (const observer of this.observers) {
      observer(data);
    }
  }

  subscribeDone(observer: () => void) {
    this.doneObservers.push(observer);
  }
  done() {
    if (!this.open) {
      return;
    }
    this.open = false;
    for (
      let doneIdx = 0, doneLen = this.doneObservers.length;
      doneIdx < doneLen;
      doneIdx++
    ) {
      this.doneObservers[doneIdx]();
    }
    this.doneObservers.length = 0;
    this.observers.length = 0;
  }
}

type Observable<T> = BaseObservable<T> & {
  pipe(pipes: []): Observable<T>;
  pipe<POut>(pipes: PipesArray<T, POut>): Observable<POut>;
  [Symbol.asyncIterator](): AsyncIterator<T>;
};

type ObservableConstructor = {
  new <T>(saveValue?: boolean): Observable<T>;
};

let Observable = BaseObservable as unknown as ObservableConstructor;
Observable = extendObservableWithPipes(
  Observable,
) as unknown as ObservableConstructor;
Observable = extendObservableWithIterator(
  Observable,
) as unknown as ObservableConstructor;

export { Observable };
export type { BaseObservable, Observer };
