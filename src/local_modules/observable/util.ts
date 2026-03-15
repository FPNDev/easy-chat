import { Observable } from './observable';

function of<T>(value?: T): Observable<T> {
  const obs = new Observable<T>();
  if (value !== undefined) {
    obs.notify(value);
  }
  return obs;
}

export { of };
