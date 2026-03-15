import axios, { AxiosError } from 'axios';
import network from './network';
import type { ChatMessage } from './types';
import { Observable } from '../../local_modules/observable/observable';

function processChat(
  slot: number,
  messages: ChatMessage[],
  abort$: Observable<void>,
) {
  const canceller = axios.CancelToken.source();
  const unsubscribe = abort$.subscribe(() => {
    unsubscribe();
    canceller.cancel();
  });

  const messageChunks$ = new Observable<
    { delta: ChatMessage },
    AxiosError | string | void
  >();

  void network('v1/chat/completions', {
    method: 'post',
    responseType: 'stream',
    adapter: 'fetch',
    data: {
      model: import.meta.env.VITE_LLAMA_MODEL,
      messages,
      stream: true,
      slot: slot,
    },
    cancelToken: canceller.token,
  })
    .then((res) => res.data as ReadableStream)
    .then(async (res) => {
      const reader = res.getReader();
      const decoder = new TextDecoder('UTF-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        const decoded = decoder.decode(value);
        for (const streamPart of decoded.split('\n')) {
          if (!streamPart.startsWith('data:')) {
            continue;
          }

          try {
            const message = JSON.parse(streamPart.replace('data: ', ''));
            messageChunks$.notify(message.choices[0]);
          } catch {
            continue;
          }
        }
      }

      messageChunks$.done();
    })
    .catch((e) => {
      messageChunks$.done(e);
    });

  return messageChunks$;
}

export { processChat };
