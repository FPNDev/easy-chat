import { Component } from './local_modules/component/component';
import { render } from './local_modules/router/render';
import { moduleDefault } from './local_modules/util/import';

import { ChatRoute, router } from './routing';

export class App extends Component<HTMLElement> {
  constructor() {
    super();

    router.route(ChatRoute, () =>
      render(this, moduleDefault(import('./layouts/ChatsLayout'))),
    );
  }

  protected view() {
    return document.getElementById('app')!;
  }
}
