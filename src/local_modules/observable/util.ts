import { Observable } from './observable';

function of<T, D = void>(value?: T): Observable<T, D> {
  const obs = new Observable<T, D>();
  if (value !== undefined) {
    obs.notify(value);
  }
  return obs;
}

export { of };
