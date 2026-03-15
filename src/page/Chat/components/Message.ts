import { Component } from '../../../local_modules/component/component';
import { useStore } from '../../../local_modules/store';
import { poolWithEvents } from '../../../local_modules/subscription/events';
import { html } from '../../../local_modules/util/html';
import type { ChatMessage } from '../../../services/agent/types';
import chatHistory from '../../../services/db/chat-history';
import { transformNewlinesForMarkdown } from '../../../util/chat';
import { dotLoaderFactory } from '../../../util/dot-loader';
import markdownConverter from '../../../util/markdown-converter';
import { ChatEventsStore, ChatStateStore } from '../stores';
import classes from '../style.module.scss';
import type { ChatMessageRender } from '../types';
import { InstructionInput } from './InstructionInput';

export class Message extends Component<HTMLElement> {
  private pool = poolWithEvents();

  private events = useStore(this, ChatEventsStore);
  private state = useStore(this, ChatStateStore);

  private _id?: number;
  private readonly loader = dotLoaderFactory(3, 'Thinking');
  private loaderWrapper?: HTMLElement;

  private resendBtn?: Node;
  private isLast = false;

  private editModeNode?: HTMLElement;

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
        ...(this._id ? { id: this._id } : null),
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

  async delete() {
    this.destroy();

    if (this._id) {
      this.events.delete$.notify(this._id);
      return chatHistory.delete(this._id, this.state.chatId$.value!);
    }
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
      this.contentElement.innerHTML = markdownConverter.makeHtml(
        transformNewlinesForMarkdown(contentToRender),
      );
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

  private startEditing() {
    if (this.editModeNode) {
      return;
    }

    const editTextArea = new InstructionInput(
      this,
      this.message.content,
      'Type your message...',
      classes.messageInput,
    );
    const textAreaView = editTextArea.ensureView();

    const saveBtn = html`<button>Save</button>` as HTMLButtonElement;
    const cancelBtn = html`<button>Cancel</button>` as HTMLButtonElement;

    const editLayout = html`<div>
      ${textAreaView}
      <div class=${classes.actions}>${saveBtn} ${cancelBtn}</div>
    </div>` as HTMLElement;

    const saveMessage = () => {
      if (!editTextArea.value) {
        return;
      }

      this.events.cancelEdit$.notify();
      this.update({
        content: editTextArea.value,
      });
      this.store().then(() => {
        this.events.edit$.notify(this._id!);
      });
    };

    saveBtn.onclick = saveMessage;
    this.pool.addEvent(textAreaView, 'submit', saveMessage);

    cancelBtn.onclick = () => {
      this.events.cancelEdit$.notify();
    };

    const unsubscribeCancel = this.pool.subscribe(
      this.events.cancelEdit$,
      () => {
        unsubscribeCancel();

        this.actionsElement!.style.display = '';
        this.editModeNode?.parentElement?.replaceChild(
          this.contentElement!,
          this.editModeNode,
        );
        this.editModeNode = undefined;
      },
    );

    this.editModeNode = editLayout;
    this.actionsElement!.style.display = 'none';
    this.contentElement!.parentElement?.replaceChild(
      editLayout,
      this.contentElement!,
    );
  }

  private renderActions() {
    if (!this.actionsElement) {
      return;
    }

    const buttons = [];

    const deleteBtn = html`<a href="#">Delete</a>` as HTMLElement;
    deleteBtn.onclick = () => this.delete();
    buttons.push(deleteBtn);

    if (this.message.role === 'user') {
      this.resendBtn = html`<!---->`;
      this.renderResend();
      buttons.push(this.resendBtn);
    }

    if (this.message.role !== 'assistant') {
      const editBtn = html`<a href="#">Edit</a>` as HTMLAnchorElement;
      editBtn.onclick = () => {
        this.events.cancelEdit$.notify();
        this.startEditing();
      };
      buttons.push(editBtn);
    }

    this.actionsElement.replaceChildren(...buttons);
  }
}
