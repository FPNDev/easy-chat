import { Observable, type Observer } from '../observable/observable';
import { unsubscribeFactory } from './unsubscribe';

export class SubscriptionPool {
  protected readonly unsubscribePool: Array<() => void> = [];

  subscribe<T>(observable: Observable<T>, observer: Observer<T>) {
    return unsubscribeFactory(
      observable.subscribe(observer),
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
