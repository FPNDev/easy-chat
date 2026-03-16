import network from './network';
import type { SlotOccupied } from './types';

const MAX_SLOTS = +import.meta.env.VITE_MAX_SLOTS || Infinity;
const PERSISTENT_SLOTS_KEY =
  import.meta.env.VITE_PERSISTENT_SLOTS_KEY || 'persistent_slots';

const HEARTBEAT_SEND_INTERVAL = 2000;
const HEARTBEAT_RECEIVE_INTERVAL = 5000;

const openChats: (string | undefined)[] = [];
const localChats: string[] = [];

const chatsChannel = new BroadcastChannel('chats');

let chatsReceived: (() => void) | undefined;
let requestedChats: Promise<void> | undefined = new Promise<void>((resolve) => {
  chatsReceived = () => {
    chatsReceived = undefined;
    resolve();
    requestedChats = undefined;
  };
});

chatsChannel.postMessage('request');
setTimeout(() => {
  chatsReceived?.();
}, 100);

chatsChannel.onmessage = (ev) => {
  const [cmd, value] = ev.data.split(':', 2);
  switch (cmd) {
    case 'heartbeat':
      if (!openChats.includes(value)) {
        const { slot: slotIdx } = findFreeSlot(value);
        if (slotIdx !== undefined && value !== null) {
          openChats[slotIdx] = value;
        }
      }

      startReceivingHeartbeat(value);

      break;
    case 'request':
      chatsChannel.postMessage('chats:' + JSON.stringify(openChats));
      break;
    case 'chats':
      if (requestedChats) {
        chatsReceived?.();
        openChats.length = 0;
        const chats = JSON.parse(value);
        for (const chatId of chats) {
          startReceivingHeartbeat(chatId);
          openChats.push(chatId);
        }
      }
      break;
  }
};

window.addEventListener('unload', () => {
  for (const chat of localChats) {
    freeSlot(chat);
  }
});

const sendHeartBeatIntervals: Record<string, number> = {};
const receiveHeartBeatIntervals: Record<string, number> = {};

function getPersistentSlots() {
  const str = localStorage.getItem(PERSISTENT_SLOTS_KEY);
  return str ? JSON.parse(str) : [];
}

function storePersistentSlots(persistentSlots: (string | undefined)[]) {
  let hasChanges = false;
  const newSlots: (string | undefined)[] = [...persistentSlots];
  for (const slotIdx in openChats) {
    if (
      openChats[slotIdx] !== undefined &&
      persistentSlots[slotIdx] !== openChats[slotIdx]
    ) {
      hasChanges = true;
      newSlots[slotIdx] = openChats[slotIdx];
    }
  }
  if (hasChanges) {
    localStorage.setItem(PERSISTENT_SLOTS_KEY, JSON.stringify(newSlots));
  }
}

function findFreeSlot(chatId: string): SlotOccupied {
  const persistentSlots = getPersistentSlots();
  const persistentIdx = persistentSlots.indexOf(chatId);
  if (
    ~persistentIdx &&
    persistentIdx < MAX_SLOTS &&
    (openChats[persistentIdx] === chatId ||
      openChats[persistentIdx] === undefined)
  ) {
    return { slot: persistentIdx, reset: false };
  }

  let freeNonPersistentSlot = persistentSlots.indexOf(undefined);
  if (!~freeNonPersistentSlot) {
    freeNonPersistentSlot = persistentSlots.length;
  }

  if (
    freeNonPersistentSlot < MAX_SLOTS &&
    (openChats[persistentIdx] === chatId ||
      openChats[persistentIdx] === undefined)
  ) {
    return { slot: freeNonPersistentSlot, reset: false };
  }

  const slotIdx = openChats.indexOf(undefined);
  return {
    slot: ~slotIdx
      ? slotIdx
      : openChats.length !== MAX_SLOTS
        ? openChats.length
        : undefined,
    reset: true,
  };
}

function removeExternalSlot(chatId: string) {
  const idx = openChats.indexOf(chatId);
  if (~idx) {
    openChats[idx] = undefined;
    clearInterval(receiveHeartBeatIntervals[chatId]);
  }
}

async function ensureSlot(chatId: string) {
  if (requestedChats) {
    await requestedChats;
  }

  const idx = openChats.indexOf(chatId);
  if (!~idx) {
    let { slot: slotIdx, reset } = findFreeSlot(chatId);
    let nextSlotIdx: number | undefined;

    while (slotIdx !== undefined && reset) {
      await eraseSlotCache(slotIdx);
      ({ slot: nextSlotIdx, reset } = findFreeSlot(chatId));
      if (nextSlotIdx === slotIdx) {
        break;
      }
      slotIdx = nextSlotIdx;
    }

    if (slotIdx === undefined) {
      return;
    }

    const persistentSlots = getPersistentSlots();

    localChats.push(chatId);
    if (openChats.length < slotIdx) {
      for (let i = openChats.length; i <= slotIdx; i++) {
        openChats[i] = undefined;
      }
    }
    openChats[slotIdx] = chatId;
    storePersistentSlots(persistentSlots);

    startSendingHeartbeat(chatId);

    return slotIdx;
  }
  startSendingHeartbeat(chatId);

  return idx;
}

function startSendingHeartbeat(chatId: string) {
  chatsChannel.postMessage(`heartbeat:${chatId}`);
  sendHeartBeatIntervals[chatId] = setInterval(() => {
    chatsChannel.postMessage(`heartbeat:${chatId}`);
  }, HEARTBEAT_SEND_INTERVAL);
}

function startReceivingHeartbeat(chatId: string) {
  clearInterval(receiveHeartBeatIntervals[chatId]);
  receiveHeartBeatIntervals[chatId] = setInterval(() => {
    removeExternalSlot(chatId);
  }, HEARTBEAT_RECEIVE_INTERVAL);
}

function freeSlot(chatId: string) {
  const idx = localChats.indexOf(chatId);
  const globalIdx = openChats.indexOf(chatId);
  if (~idx) {
    localChats.splice(idx, 1);
  }
  if (~globalIdx) {
    openChats[globalIdx] = undefined;
  }
  clearInterval(sendHeartBeatIntervals[chatId]);
}

function eraseSlotCache(slotId: number) {
  return network(`slots/${slotId}?action=erase`, {
    method: 'POST',
  });
}

export { ensureSlot, freeSlot };
