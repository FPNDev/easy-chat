import { Component } from '../../local_modules/component/component';
import { attachStore } from '../../local_modules/store';
import { poolWithEvents } from '../../local_modules/subscription/events';
import { html } from '../../local_modules/util/html';
import { ChatRoute, router } from '../../routing';
import type { ChatMessage } from '../../services/agent/types';
import { InstructionInput } from './components/InstructionInput';
import { Messages } from './components/Messages';
import { ChatEventsStore, ChatStateStore } from './stores';
import classes from './style.module.scss';

class Chat extends Component<HTMLElement> {
  private pool = poolWithEvents();

  private events = attachStore(this, ChatEventsStore);
  private state = attachStore(this, ChatStateStore);

  constructor() {
    super();

    router.route(ChatRoute, () => {
      const params = router.getParams();
      if (!params?.groups?.id) {
        router.go('/');
        return;
      }

      this.state.chatId$.notify(params.groups.id);
    });

    this.state.scrollableElement = this.ensureView();
  }

  view(): HTMLElement {
    const messagesSection = new Messages(this);

    return html`
      <div class="${classes.startPage}">
        ${messagesSection}
        <div class=${classes.footer}>
          ${this.renderTextArea()}
          <div class=${classes.buttons}>
            <div>
              ${this.renderAddBtn('Send', 'user')} ${this.renderAbortBtn()}
            </div>
            <div>
              ${this.renderAddBtn('Send developer instruction', 'developer')}
              ${this.renderAddBtn('Send system instruction', 'system')}
            </div>
            ${this.renderClearBtn()}
          </div>
        </div>
      </div>
    ` as HTMLElement;
  }

  private renderAddBtn(title: string, role: ChatMessage['role']) {
    const addButton = html`
      <button class="${classes.addButton}">${title}</button>
    ` as HTMLButtonElement;

    addButton.onclick = () => this.events.messageSubmitted$.notify(role);
    this.pool.subscribe(this.state.loading$, () => {
      addButton.disabled = !!this.state.loading$.value;
    });

    return addButton;
  }

  private renderAbortBtn() {
    const abortButton = html`
      <button class="${classes.abortButton}" disabled>Abort</button>
    ` as HTMLButtonElement;

    abortButton.onclick = () => {
      this.events.abort$.notify();
    };

    this.pool.subscribe(this.state.loading$, () => {
      abortButton.disabled = !this.state.loading$.value;
    });

    return abortButton;
  }

  private renderClearBtn() {
    const clearButton = html`
      <button class="${classes.clearButton}">Clear</button>
    ` as HTMLButtonElement;

    clearButton.onclick = () => {
      this.events.clear$.notify();
    };

    return clearButton;
  }

  private renderTextArea() {
    const textArea = new InstructionInput(
      this,
      undefined,
      'Chat with AI...',
      classes.messageBox,
    );

    const view = textArea.ensureView();
    this.pool.addEvent(view, 'input', () => {
      this.state.messageText$.notify(textArea.value);
    });
    this.pool.subscribe(this.state.messageText$, (value) => {
      textArea.value = value;
    });

    this.pool.addEvent(view, 'submit', (e) => {
      this.events.messageSubmitted$.notify(
        (e instanceof CustomEvent && e.detail.role) || 'user',
      );
    });

    return view;
  }
}

export default Chat;
