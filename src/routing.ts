import { App } from './app';
import { type Route } from './local_modules/router/interface/route';
import { setupRouter } from './local_modules/router/setup';

const StartRoute = {
  path: '/',
};

const ChatRoute = {
  path: /\/chat\/(?<id>[^/]+)/,
};

const NotFoundRoute = {
  path: /.*/,
};

const routes: Route[] = [
  StartRoute, // path: /
  ChatRoute,

  NotFoundRoute // any path, must be last
] as const;

const router = setupRouter(routes);
document.body.appendChild(new App().ensureView());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).router = router;

export { router };
export { StartRoute, ChatRoute };
