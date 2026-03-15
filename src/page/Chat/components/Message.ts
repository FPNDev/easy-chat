import { Component } from '../../../local_modules/component/component';
import { useStore } from '../../../local_modules/store';
import { html } from '../../../local_modules/util/html';
import type { ChatMessage } from '../../../services/agent/types';
import chatHistory from '../../../services/db/chat-history';
import { dotLoaderFactory } from '../../../util/dot-loader';
import markdownConverter from '../../../util/markdown-converter';
import { ChatEventsStore, ChatStateStore } from '../stores';
import classes from '../style.module.scss';
import type { ChatMessageRender } from '../types';

export class Message extends Component<HTMLElement> {
  private events = useStore(this, ChatEventsStore);
  private state = useStore(this, ChatStateStore);

  private _id?: number;
  private readonly loader = dotLoaderFactory(3, 'Thinking');
  private loaderWrapper?: HTMLElement;

  private resendBtn?: Node;
  private isLast = false;

  get id() {
    return this._id;
  }

  readonly message: ChatMessage;

  private contentElement?: HTMLElement;
  private actionsElement?: HTMLElement;

  constructor(parent: Component, message: ChatMessage, id?: number) {
    super(parent);
    this.message = message;
    this._id = id;
  }

  markAsLast(isLast: boolean) {
    if (this.isLast === isLast) {
      return;
    }
    this.isLast = isLast;
    this.renderResend();
  }

  store() {
    if (!this.message.content) {
      throw new Error('Cannot store empty messages');
    }

    return chatHistory
      .put({
        chat_id: this.state.chatId$.value!,
        message: this.message,
      })
      .then((entryId) => {
        this._id = entryId;
        this.renderSavedEntry();
        return entryId;
      });
  }

  update(newMessage: Partial<Omit<ChatMessageRender, 'role'>>) {
    Object.assign(this.message, newMessage);
    this.updateContent();
  }

  view(): HTMLElement {
    return html`<div class="${classes.message}">
      <div class=${classes.messageUser}>${this.message.role}:</div>
      ${this.renderContent()} ${this.renderActionsWrapper()}
    </div>` as HTMLElement;
  }

  protected onDisconnect(): void {
    this.loader.stop();
  }

  private renderSavedEntry() {
    this.renderActions();
  }

  private renderContent() {
    this.contentElement = html`
      <div class="${classes.messageContent}"></div>
    ` as HTMLElement;

    this.updateContent();

    return this.contentElement;
  }

  private updateContent() {
    if (!this.contentElement) {
      return;
    }

    const messageContent = this.message.content;
    const contentToRender = messageContent || this.message.reasoning_content;

    const loaderActive = this.loader.node.isConnected;

    if (contentToRender) {
      this.contentElement.innerHTML =
        markdownConverter.makeHtml(contentToRender);
      if (loaderActive) {
        this.loader.stop();
      }
    } else if (!loaderActive) {
      this.contentElement.appendChild(this.ensureLoader());
      this.loader.start();
    }
    this.contentElement.classList[messageContent ? 'remove' : 'add'](
      classes.reasoning,
    );
  }

  private ensureLoader() {
    this.loaderWrapper ??= html`<div class=${classes.messageLoader}>
      ${this.loader.node}
    </div>` as HTMLElement;

    return this.loaderWrapper;
  }

  private renderActionsWrapper() {
    this.actionsElement = html`<div
      class=${classes.messageActions}
    ></div>` as HTMLElement;
    if (this._id) {
      this.renderSavedEntry();
    }

    return this.actionsElement;
  }

  private delete() {
    this.destroy();

    if (this._id) {
      this.events.delete$.notify(this._id);
      chatHistory.delete(this._id, this.state.chatId$.value!);
    }
  }

  private renderResend() {
    if (!this.resendBtn || this.message.role !== 'user') {
      return;
    }

    let newResend;

    if (this.isLast) {
      newResend = html`<a href="#">Resend</a>` as HTMLElement;
      newResend.onclick = () => this.events.sendToAssistant$.notify();
    } else {
      newResend = html`<!---->`;
    }

    this.resendBtn?.parentElement?.replaceChild(newResend, this.resendBtn);
    this.resendBtn = newResend;
  }

  private renderActions() {
    if (!this.actionsElement) {
      return;
    }

    const deleteBtn = html`<a href="#">Delete</a>` as HTMLElement;
    deleteBtn.onclick = () => this.delete();

    this.resendBtn = html`<!---->`;
    this.renderResend();

    this.actionsElement.replaceChildren(deleteBtn, this.resendBtn);
  }
}
