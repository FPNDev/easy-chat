import { Component } from './local_modules/component/component';
import { render } from './local_modules/router/render';
import { type Router } from './local_modules/router/setup';
import { moduleDefault } from './local_modules/util/import';

import { ChatRoute } from './routing';

export class App extends Component<HTMLElement> {
  constructor(router: Router) {
    super();

    router.route(ChatRoute, () =>
      render(this, moduleDefault(import('./page/Chat/index'))),
    );
  }

  protected view() {
    return document.getElementById('app')!;
  }
}
