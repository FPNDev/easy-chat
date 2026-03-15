import type { Component } from '../component/component';

type Store<T> = {
  initialValue: () => T;
}

const stores = new Map<Component, Map<Store<unknown>, unknown>>();

export function createStore<T>(initialValue: () => T): Store<T> {
  return { initialValue };
}

export function attachStore<T>(component: Component, store: Store<T>) {
  let storesMap = stores.get(component);
  if (!storesMap) {
    storesMap = new Map<Store<T>, Store<T>['initialValue']>();
    stores.set(component, storesMap);
  }

  const storeValue = store.initialValue();
  storesMap.set(store, storeValue);
  
  return storeValue;
}

export function useStore<T>(component: Component, storeIdentifier: Store<T>): T {
  do {
    const storesMap = stores.get(component);
    if (storesMap) {
      const store = storesMap.get(storeIdentifier) as T;
      if (store) return store;
    }
  } while ((component = component.parent!));
  
  throw new Error('Store not found');
}
