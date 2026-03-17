import { Component } from '../../local_modules/component/component';
import { render } from '../../local_modules/router/render';
import { attachStore } from '../../local_modules/store';
import { subscriptionPool } from '../../local_modules/subscription/pool';
import { html } from '../../local_modules/util/html';
import { moduleDefault } from '../../local_modules/util/import';
import { ChatRoute, router } from '../../routing';
import chatHistory from '../../services/db/chat-history';
import { ChatsLayoutStore } from './stores';
import classes from './style.module.scss';

class ChatsLayout extends Component<HTMLElement> {
  private pool = subscriptionPool();
  private loading$!: Promise<void>;

  private contentNode!: Node;
  private sidebar!: HTMLElement;

  constructor(parent: Component) {
    super(parent);

    this.ensureView();

    const store = attachStore(this, ChatsLayoutStore);
    this.pool.subscribe(store.addChat$, (chatId: string) => {
      this.loading$.then(() => {
        this.addChatToSidebar(chatId);
      });
    });

    router.route(ChatRoute, () => {
      render(
        this,
        moduleDefault(import('../../pages/Chat')),
        this.contentNode,
        true,
      );
    });
  }

  addChatToSidebar(chatId: string) {
    const chatHref = `/chat/${chatId}`;

    const linkElement = html`<a
      class=${classes.chat}
    ></a>` as HTMLAnchorElement;
    linkElement.innerText = chatId;
    linkElement.href = chatHref;

    linkElement.onclick = (ev) => {
      ev.preventDefault();
      router.go(`/chat/${chatId}`);
    };

    this.sidebar.appendChild(linkElement);
  }

  renderSidebar() {
    this.sidebar = html`<div class=${classes.sidebar}>
      <div class=${classes.sidebarTitle}>Chats: </div>
    </div>` as HTMLElement;
    this.loading$ = chatHistory.getChats().then((chats) => {
      for (const chatId of chats) {
        this.addChatToSidebar(chatId);
      }
    });

    return this.sidebar;
  }

  view() {
    this.contentNode = html`<!---->`;

    return html`<div class=${classes.layout}>
      ${this.renderSidebar()} ${this.contentNode}
    </div>` as HTMLElement;
  }
}

export default ChatsLayout;
