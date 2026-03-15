import { type Route } from "./interface/route";

export function aliasRoute(route: Route, alias: string | RegExp): Route {
  const newRoute = cloneRoute(route);
  newRoute.path = alias;
  newRoute.aliasOf = route;

  return newRoute;
}

const cloneRoute = (route: Route): Route => {
  const newRoute: Partial<Route> = {
    path: route.path,
  };
  if ("children" in route && route.children) {
    const children: Route[] = (newRoute.children = []);
    for (const child of route.children) {
      children.push(cloneRoute(child));
    }
  }

  return newRoute as Route;
};
