import network from './network';

const MAX_SLOTS = +import.meta.env.VITE_MAX_SLOTS || Infinity;
const HEARTBEAT_SEND_INTERVAL = 2000;
const HEARTBEAT_RECEIVE_INTERVAL = 5000;

const openChats: (string | null)[] = [];
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
        const slotIdx = findFreeSlot();
        if (slotIdx !== null) {
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

setInterval(() => console.log(openChats));

const sendHeartBeatIntervals: Record<string, number> = {};
const receiveHeartBeatIntervals: Record<string, number> = {};

function findFreeSlot() {
  const slotIdx = openChats.indexOf(null);
  return ~slotIdx
    ? slotIdx
    : openChats.length !== MAX_SLOTS
      ? openChats.length
      : null;
}

function removeExternalSlot(chatId: string) {
  const idx = openChats.indexOf(chatId);
  if (~idx) {
    openChats[idx] = null;
    clearInterval(receiveHeartBeatIntervals[chatId]);
  }
}

async function ensureSlot(chatId: string) {
  if (requestedChats) {
    await requestedChats;
  }

  const idx = openChats.indexOf(chatId);
  if (!~idx) {
    let slotIdx = findFreeSlot();

    while (slotIdx !== null) {
      await eraseSlotCache(slotIdx);
      const nextSlotIdx = findFreeSlot();
      if (nextSlotIdx === slotIdx) {
        break;
      }
      slotIdx = nextSlotIdx;
    }
    
    if (slotIdx === null) {
      return;
    }

    localChats.push(chatId);
    openChats[slotIdx] = chatId;
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
    openChats[globalIdx] = null;
  }
  clearInterval(sendHeartBeatIntervals[chatId]);
}

function eraseSlotCache(slotId: number) {
  return network(`slots/${slotId}`, {
    method: 'POST',
    data: {
      action: 'erase',
    },
  });
}

export { ensureSlot, freeSlot };
