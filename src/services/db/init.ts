import { createChatHistory } from "./chat-history";
import { dbRequestToPromise } from "./util";

const dbName = "chat";
const dbOpenRequest = indexedDB.open(dbName, 3);

dbOpenRequest.onupgradeneeded = (event: IDBVersionChangeEvent) => {
  const db = (event.target as IDBOpenDBRequest).result;
  if (!event.oldVersion) {
    createChatHistory(db);
  }
};

export const dbReady$ = dbRequestToPromise<IDBDatabase>(dbOpenRequest);
