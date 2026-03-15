import { dbReady$ } from './init';
import type { ChatMessageEntry } from './types';
import { dbRequestToPromise } from './util';

const chatMessagesMap$ = new Map<string, Promise<ChatMessageEntry[]>>();

function createChatHistory(db: IDBDatabase) {
  const historyStore = db.createObjectStore('chat_history', {
    keyPath: 'id',
    autoIncrement: true,
  });
  historyStore.createIndex('message', 'message', { unique: false });
  historyStore.createIndex('chat_id', 'chat_id', { unique: false });
}

function getObjectStore() {
  return dbReady$.then((db) =>
    db.transaction('chat_history', 'readwrite').objectStore('chat_history'),
  );
}

async function put(entry: Omit<ChatMessageEntry, 'id'> & { id?: number }) {
  const objectStore = await getObjectStore();
  const entryId = await dbRequestToPromise<number>(objectStore.put(entry));
  if (!entry.id) {
    entry.id = entryId;
  }

  const currentMessages = await chatMessagesMap$.get(entry.chat_id);
  if (currentMessages) {
    const putAtIdx = currentMessages.findIndex((item) => item.id === entryId);
    if (~putAtIdx) {
      currentMessages[putAtIdx] = entry as ChatMessageEntry;
    } else {
      currentMessages.push(entry as ChatMessageEntry);
    }
  }

  return entryId;
}

async function deleteEntry(entryId: number, chatId: string) {
  const currentMessages = await chatMessagesMap$.get(chatId);
  if (!currentMessages) {
    return;
  }

  const objectStore = await getObjectStore();
  await dbRequestToPromise(objectStore.delete(entryId));

  const idx = currentMessages.findIndex((item) => item.id === entryId);
  if (~idx) {
    currentMessages.splice(idx, 1);
  }
}

async function getChat(chatId: string) {
  const currentMessages = await chatMessagesMap$.get(chatId);
  if (!currentMessages) {
    const objectStore = await getObjectStore();
    const currentMessagesPromise = dbRequestToPromise<ChatMessageEntry[]>(
      objectStore.index('chat_id').getAll(chatId),
    );
    chatMessagesMap$.set(chatId, currentMessagesPromise);

    return currentMessagesPromise;
  }

  return [...currentMessages];
}

async function clear(chatId: string) {
  const objectStore = await getObjectStore();
  await dbRequestToPromise(objectStore.clear());

  const currentMessages = await chatMessagesMap$.get(chatId)!;
  if (currentMessages) {
    currentMessages.length = 0;
  }
}

export default {
  put,
  getChat,
  delete: deleteEntry,
  clear,
};
export { createChatHistory };
