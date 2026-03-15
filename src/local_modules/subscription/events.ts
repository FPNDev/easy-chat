import { SubscriptionPool } from './pool';
import { unsubscribeFactory } from './unsubscribe';

type EventListenerOrListenerObject<T extends Event = Event> = (
  evt: T,
) => void | {
  handleEvent(evt: T): void;
};

class EventSubscriptionPool extends SubscriptionPool {
  // HTMLElement overloads
  addEvent<K extends keyof HTMLElementEventMap>(
    object: HTMLElement,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): () => void;

  // Window overloads
  addEvent<K extends keyof WindowEventMap>(
    object: Window,
    type: K,
    listener: (this: Window, ev: WindowEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): () => void;

  // Document overloads
  addEvent<K extends keyof DocumentEventMap>(
    object: Document,
    type: K,
    listener: (this: Document, ev: DocumentEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): () => void;

  // Fallback for any generic events

  addEvent<RT extends Event>(
    object: EventTarget,
    type: string,
    listener: EventListenerOrListenerObject<RT>,
    options?: boolean | AddEventListenerOptions,
  ): () => void;

  addEvent(
    object: EventTarget,
    type: string,
    listener: EventListenerOrListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): () => void {
    object.addEventListener(type, listener, options);

    return unsubscribeFactory(
      () => object.removeEventListener(type, listener, options),
      this.unsubscribePool,
    );
  }
}

export const poolWithEvents = () => new EventSubscriptionPool();
