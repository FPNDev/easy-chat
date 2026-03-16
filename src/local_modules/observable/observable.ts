import { extendObservableWithIterator } from './iterator';
import { extendObservableWithPipes, type PipesArray } from './pipes';

type Observer<T> = (data: T) => void;

class BaseObservable<T, D = void> {
  private observers: Observer<T>[] = [];
  private doneObservers: Observer<D>[] = [];
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

  subscribe(observer: Observer<T>) {
    return this._subscribe(this.observers, observer);
  }

  subscribeDone(observer: Observer<D>) {
    return this._subscribe(this.doneObservers, observer);
  }

  done(doneValue: D) {
    if (!this.open) {
      return;
    }
    this.open = false;
    for (const observer of this.doneObservers) {
      observer(doneValue);
    }
    this.doneObservers.length = 0;
    this.observers.length = 0;
  }

  private _subscribe<R>(subPool: Observer<R>[], observer: Observer<R>) {
    let subscribed: boolean | undefined;
    if (this.open) {
      subscribed = true;
      subPool.push(observer);
    }

    return () => {
      if (subscribed) {
        subPool.splice(subPool.indexOf(observer), 1);
        subscribed = undefined;
      }
    };
  }
}

type Observable<T, D = void> = BaseObservable<T, D> & {
  pipe(pipes: []): Observable<T, D>;
  pipe<POut>(pipes: PipesArray<T, POut>): Observable<POut, D>;
  [Symbol.asyncIterator](): AsyncIterator<T>;
};

type ObservableConstructor = {
  new <T, D>(saveValue?: boolean): Observable<T, D>;
};

let Observable = BaseObservable as unknown as ObservableConstructor;
Observable = extendObservableWithPipes(
  Observable,
) as unknown as ObservableConstructor;
Observable = extendObservableWithIterator(
  Observable,
) as unknown as ObservableConstructor;

export { Observable, BaseObservable };
export type { Observer };
