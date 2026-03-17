import { ChatsLayoutStore } from '../../../layouts/ChatsLayout/stores';
import { Component } from '../../../local_modules/component/component';
import { useStore } from '../../../local_modules/store';
import { poolWithEvents } from '../../../local_modules/subscription/events';
import { html } from '../../../local_modules/util/html';
import { processChat } from '../../../services/agent';
import { ensureSlot, freeSlot } from '../../../services/agent/slots';
import chatHistory from '../../../services/db/chat-history';
import { ChatEventsStore, ChatStateStore } from '../stores';
import classes from '../style.module.scss';
import { Message } from './Message';

export class Messages extends Component<HTMLElement> {
  private pool = poolWithEvents();
  private slotPromise?: Promise<number | undefined>;

  private layoutStore = useStore(this, ChatsLayoutStore);

  private events = useStore(this, ChatEventsStore);
  private state = useStore(this, ChatStateStore);

  private renderedMessages = new Map<number, Message>();

  constructor(parentComponent: Component) {
    super(parentComponent);

    this.ensureView();

    let lastChatId = this.state.chatId$.value;
    this.pool.subscribe(this.state.chatId$, async (newId) => {
      if (lastChatId !== newId) {
        this.freeSlot(lastChatId);
        lastChatId = newId;
        this.loadCurrentChat();
      }
    });

    this.pool.subscribe(this.events.messageSubmitted$, async (role) => {
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
          content: message,
          reasoning_content: '',
          role: role,
        }),
      );

      const chatId = this.state.chatId$.value!;
      messageComponent.store().then(async () => {
        const isFirstMessage = (await chatHistory.getChat(chatId)).length === 1;
        if (isFirstMessage) {
          this.layoutStore.addChat$.notify(chatId);
        }

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

      const renderedMessagesArr = Array.from(this.renderedMessages.keys());
      if (renderedMessagesArr[0] === entryId) {
        this.events.clear$.notify();
        return;
      }

      for (let i = renderedMessagesArr.length - 1; i >= 0; --i) {
        const renderedMessage = this.renderedMessages.get(
          renderedMessagesArr[i],
        )!;
        renderedMessage.delete();

        if (renderedMessage.id === entryId) {
          break;
        }
      }
    });

    this.pool.subscribe(this.events.edit$, (entryId) => {
      this.events.abort$.notify();

      const removals: Promise<void>[] = [];
      const renderedMessagesArr = Array.from(this.renderedMessages.values());
      for (let i = renderedMessagesArr.length - 1; i >= 0; --i) {
        const renderedMessage = renderedMessagesArr[i];
        if (renderedMessage.id === entryId) {
          break;
        }

        removals.push(renderedMessage.delete());
      }

      Promise.all(removals).then(() => this.sendToAssistant());
    });

    this.loadCurrentChat();
  }

  view() {
    return html`<div class=${classes.messages}></div>` as HTMLElement;
  }

  onDisconnect(): void {
    this.freeSlot(this.state.chatId$.value!);
    this.events.abort$.notify();
    this.pool.clear();
  }

  private freeSlot(chatId?: string, freePersistentSlot?: boolean) {
    this.slotPromise?.then(() => {
      if (chatId !== undefined) {
        freeSlot(chatId, freePersistentSlot);
      }
    });
    this.slotPromise = undefined;
  }

  private clearChat() {
    const chatId = this.state.chatId$.value!;
    this.freeSlot(chatId, true);
    chatHistory.clear(chatId);
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
    const chatId = this.state.chatId$.value!;
    const chatEntries = await chatHistory.getChat(chatId);
    const lastEntry = chatEntries.at(-1);
    if (!lastEntry || !lastEntry.id || lastEntry.message.role !== 'user') {
      return;
    }

    const userMessage = this.renderedMessages.get(lastEntry.id)!;
    userMessage.removeActions();

    this.slotPromise ??= ensureSlot(chatId);
    let slot;
    try {
      slot = await this.slotPromise;
    } catch {
      // will be handled by slot === undefined
    }

    if (slot === undefined) {
      userMessage.restoreActions();
      this.slotPromise = undefined;
      alert('No available slots for chat, try later');
      return;
    }

    if (chatId !== this.state.chatId$.value!) {
      // changed chat during slot resolution
      return;
    }
    userMessage.restoreActions();

    this.state.loading$.notify(true);

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
      slot,
      chatEntries.map((m) => m.message),
      this.events.abort$,
    );

    this.pool.subscribe(messageChunks$, (messageChunk) => {
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
    });

    this.pool.subscribeDone(messageChunks$, async (error) => {
      if (!error) {
        await newMessage.store();
        this.markStored(newMessage);
      } else {
        newMessage.destroy();
      }

      this.state.loading$.notify(false);
    });

    this.pool.subscribe(this.events.abort$, () =>
      messageChunks$.done('Cancelled by system / user'),
    );
  }
}
