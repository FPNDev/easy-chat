import { Observable } from '../../local_modules/observable/observable';
import { createStore } from '../../local_modules/store';

type ChatEvents = {
  sendToAssistant$: Observable<void>;
  messageSubmitted$: Observable<string>;
  clear$: Observable<void>;
  abort$: Observable<void>;
  delete$: Observable<number>;
  cancelEdit$: Observable<void>;
  edit$: Observable<number>;
};

const ChatEventsStore = createStore<ChatEvents>(() => ({
  abort$: new Observable() as ChatEvents['abort$'],
  messageSubmitted$: new Observable() as ChatEvents['messageSubmitted$'],
  clear$: new Observable() as ChatEvents['clear$'],
  sendToAssistant$: new Observable() as ChatEvents['sendToAssistant$'],
  delete$: new Observable() as ChatEvents['delete$'],
  cancelEdit$: new Observable() as ChatEvents['cancelEdit$'],
  edit$: new Observable() as ChatEvents['edit$'],
}));

type ChatState = {
  chatId$: Observable<string>;
  messageText$: Observable<string>;
  loading$: Observable<boolean>;
  scrollableElement: HTMLElement;
};
const ChatStateStore = createStore<ChatState>(() => ({
  chatId$: new Observable(true) as ChatState['chatId$'],
  messageText$: new Observable(true) as ChatState['messageText$'],
  loading$: new Observable(true) as ChatState['loading$'],
  scrollableElement: undefined as unknown as HTMLElement,
}));

export { ChatEventsStore, ChatStateStore };
export type { ChatEvents, ChatState };
