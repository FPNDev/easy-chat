import axios from 'axios';
import { Component } from '../../../local_modules/component/component';
import { useStore } from '../../../local_modules/store';
import { poolWithEvents } from '../../../local_modules/subscription/events';
import { html } from '../../../local_modules/util/html';
import { processChat } from '../../../services/agent';
import chatHistory from '../../../services/db/chat-history';
import { type ChatEvents, ChatEventsStore, ChatStateStore } from '../stores';
import classes from '../style.module.scss';
import { Message } from './Message';

export class Messages extends Component<HTMLElement> {
  private pool = poolWithEvents();

  private events = useStore<ChatEvents>(this, ChatEventsStore);
  private state = useStore(this, ChatStateStore);

  private renderedMessages = new Map<number, Message>();

  constructor(parentComponent: Component) {
    super(parentComponent);

    this.ensureView();
    this.loadCurrentChat();

    let lastChatId = this.state.chatId$.value;
    this.pool.subscribe(this.state.chatId$, async (newId) => {
      if (lastChatId !== newId) {
        lastChatId = newId;
        this.loadCurrentChat();
      }
    });

    this.pool.subscribe(this.events.messageSubmitted$, (role) => {
      if (this.state.loading$.value) {
        return;
      }
      const message = this.state.messageText$.value;
      if (!message) {
        return;
      }

      this.state.messageText$.notify('');
      const messageComponent = this.renderMessage(
        new Message(this, {
          content: message.replace(/\n{1,1}/g, '\n\n'),
          reasoning_content: '',
          role: role,
        }),
      );

      messageComponent.store().then(() => {
        this.markStored(messageComponent);

        if (role === 'user') {
          this.sendToAssistant();
        }
      });
    });

    this.pool.subscribe(this.events.clear$, () => {
      this.events.abort$.notify();
      this.clearChat();
    });

    this.pool.subscribe(this.events.abort$, () => {
      this.state.loading$.notify(false);
    });

    this.pool.subscribe(this.events.delete$, (entryId) => {
      this.events.abort$.notify();
      this.renderedMessages.delete(entryId);
      this.markLastMessage();
    });

    this.pool.subscribe(this.events.sendToAssistant$, () =>
      this.sendToAssistant(),
    );
  }

  clearChat() {
    chatHistory.clear(this.state.chatId$.value!);
    this.clearRenderedMessages();
  }

  private markStored(message: Message) {
    this.renderedMessages.set(message.id!, message);
  }

  private renderMessage(message: Message) {
    const shouldScrollToBottom = this.shouldScrollToBottom();

    const newNode = message.ensureView();
    const existingNode =
      message.id && this.renderedMessages.get(message.id)?.ensureView();

    if (message.id) {
      this.markStored(message);
      this.markLastMessage();
    }

    if (existingNode) {
      this.node.replaceChild(newNode, existingNode);
    } else {
      this.node.appendChild(newNode);
    }

    if (shouldScrollToBottom) {
      this.scrollToBottom();
    }

    return message;
  }

  private markLastMessage() {
    const keys = Array.from(this.renderedMessages.keys());
    const prevLast = keys.at(-2);
    const curLast = keys.at(-1);

    if (prevLast) {
      this.renderedMessages.get(prevLast)!.markAsLast(false);
    }
    if (curLast) {
      this.renderedMessages.get(curLast)?.markAsLast(true);
    }
  }

  private shouldScrollToBottom() {
    const scrollableElement = this.state.scrollableElement;
    return (
      Math.ceil(
        scrollableElement.scrollTop + scrollableElement.offsetHeight,
      ) === scrollableElement.scrollHeight
    );
  }

  private scrollToBottom() {
    const scrollableElement = this.state.scrollableElement;
    scrollableElement.scrollTop = scrollableElement.scrollHeight;
  }

  private async loadCurrentChat() {
    this.events.abort$.notify();
    this.clearRenderedMessages();

    const entries = await chatHistory.getChat(this.state.chatId$.value!);
    for (const entry of entries) {
      this.renderMessage(new Message(this, entry.message, entry.id));
    }

    const lastMessage = entries.at(-1);
    if (lastMessage && lastMessage.message.role === 'user') {
      this.sendToAssistant();
    }
  }

  private clearRenderedMessages() {
    for (const [messageKey, message] of this.renderedMessages.entries()) {
      message!.destroy();
      this.renderedMessages.delete(messageKey);
    }
  }

  private async sendToAssistant() {
    this.state.loading$.notify(true);

    const chatEntries = await chatHistory.getChat(this.state.chatId$.value!);
    const lastEntryId = chatEntries.at(-1)?.id;
    if (!lastEntryId) {
      return;
    }

    const userMessage = this.renderedMessages.get(lastEntryId);
    if (userMessage?.message.role !== 'user') {
      return;
    }

    const chatId = this.state.chatId$.value;
    userMessage.markAsLast(false);
    
    const newMessage = this.renderMessage(
      new Message(this, {
        role: 'assistant',
        content: '',
        reasoning_content: '',
      }),
    );

    let content = '';
    let reasoning = '';

    const messageChunks$ = processChat(
      chatEntries.map((m) => m.message),
      this.events.abort$,
    );

    try {
      for await (const messageChunk of messageChunks$) {
        if (axios.isAxiosError(messageChunk)) {
          throw messageChunk;
        }

        content += messageChunk.delta.content ?? '';
        reasoning += messageChunk.delta.reasoning_content ?? '';

        if (content || reasoning) {
          const shouldScrollToBottom = this.shouldScrollToBottom();
          newMessage.update({
            content,
            reasoning_content: reasoning,
          });

          if (shouldScrollToBottom) {
            this.scrollToBottom();
          }
        }
      }

      await newMessage.store();
      newMessage.markAsLast(true);
      this.markStored(newMessage);

      this.state.loading$.notify(false);
    } catch (e) {
      if (axios.isCancel(e)) {
        console.log('Request was aborted');
      }

      newMessage.destroy();
      userMessage.markAsLast(true);

      if (chatId === this.state.chatId$.value) {
        this.state.loading$.notify(false);
      }
    }
  }

  view() {
    return html`<div class=${classes.messages}></div>` as HTMLElement;
  }

  onDisconnect(): void {
    this.events.abort$.notify();
    this.pool.clear();
  }
}
