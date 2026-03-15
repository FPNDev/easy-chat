import { Observable, type Observer } from '../observable/observable';
import { unsubscribeFactory } from './unsubscribe';

export class SubscriptionPool {
  protected readonly unsubscribePool: Array<() => void> = [];

  subscribe<T, D>(observable: Observable<T, D>, observer: Observer<T>) {
    return unsubscribeFactory(
      observable.subscribe(observer),
      this.unsubscribePool,
    );
  }

  subscribeDone<T, D>(observable: Observable<T, D>, observer: Observer<D>) {
    return unsubscribeFactory(
      observable.subscribeDone(observer),
      this.unsubscribePool,
    );
  }

  clear() {
    while (this.unsubscribePool.length) {
      this.unsubscribePool[0]();
    }
  }
}

export const subscriptionPool = () => new SubscriptionPool();
