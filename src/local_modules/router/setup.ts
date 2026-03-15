import { type Route } from './interface/route';
import { findLocation } from './paths';

export type RouteUpdateEvent = CustomEvent<{
  previousPath: Route;
  currentPath: Route;
  previousLocation: URL;
  currentLocation: URL;
}>;

export type RoutesAction = {
  routes: Route[];
  action: (previousPath: Route, previousLocation?: URL) => unknown;
};

export type RouteAction = {
  route: Route;
  action: RoutesAction['action'];
};

export function setupRouter(
  routes: Route[],
  getPathname: () => string = () => location.pathname,
) {
  let previousLocation: URL | undefined;
  let queuedPromise: Promise<[Route, RegExpMatchArray | null]> | void;

  let activeLocation: URL;
  let activePath: Route;
  let previousPath: Route;
  let routeParams: Readonly<RegExpMatchArray> | null;

  const runNavigation = async () => {
    const pathname = getPathname();
    const fakeURL = new URL(pathname + location.search, location.origin);

    if (!activeLocation || activeLocation.href !== fakeURL.href) {
      const currentPromise = (queuedPromise = findLocation(routes, pathname));
      const [foundLocation, matchedParams] = await currentPromise;

      if (foundLocation && currentPromise === queuedPromise) {
        previousPath = activePath;
        previousLocation = activeLocation;

        activeLocation = fakeURL;

        activePath = foundLocation;
        routeParams = matchedParams && Object.freeze(matchedParams);

        runRouteListeners(activePath, previousPath, previousLocation);
        queuedPromise = undefined;
      }
    }
  };

  const routeListeners: RoutesAction[] = [];

  const runRouteListeners = (
    activePath: Route,
    previousPath: Route,
    previousLocation: URL,
  ) => {
    const actionsToWait = new Set();

    const performAction = (listener: RoutesAction) => {
      const action = listener.action(previousPath, previousLocation);
      if (action instanceof Promise) {
        actionsToWait.add(action);
      }
    };

    for (const listener of routeListeners) {
      if (
        listener.routes.includes(activePath) ||
        (activePath.aliasOf && listener.routes.includes(activePath.aliasOf))
      ) {
        performAction(listener);
      }
    }

    return Promise.all(actionsToWait);
  };

  const onRoutes = (
    routes: RoutesAction['routes'],
    action: RoutesAction['action'],
  ) => {
    routeListeners.push({ routes, action });
    if (!queuedPromise) {
      for (const route of routes) {
        if (
          activePath === route ||
          (route.aliasOf && activePath === route.aliasOf)
        ) {
          action(previousPath, previousLocation);
        }
      }
    }
  };

  const onRoute = (
    route: RouteAction['route'],
    action: RouteAction['action'],
  ) => {
    return onRoutes([route], action);
  };

  window.addEventListener('popstate', runNavigation);
  runNavigation();

  return {
    go(url: string) {
      history.pushState(null, '', url);
      return runNavigation();
    },
    getPath() {
      return getPathname();
    },
    getParams() {
      return routeParams;
    },
    routes(routes: RoutesAction['routes'], action: RoutesAction['action']) {
      return onRoutes(routes, action);
    },
    route(route: RouteAction['route'], action: RouteAction['action']) {
      return onRoute(route, action);
    },
  };
}

export type Router = ReturnType<typeof setupRouter>;
