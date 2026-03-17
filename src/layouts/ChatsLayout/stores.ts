import { Observable } from '../../local_modules/observable/observable';
import { createStore } from '../../local_modules/store';

const ChatsLayoutStore = createStore(() => ({
  addChat$: new Observable<string>(),
  removeChat$: new Observable<string>()
}));

export { ChatsLayoutStore };
