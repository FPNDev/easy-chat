import escapeStringRegexp from "escape-string-regexp";
import {
  hasCompiledPathForRoute,
  type Route,
  type RouteWithCompiledPath,
} from "./interface/route";

function compilePath(route: Route, pathPrefix: string | RegExp): void {
  const newRoute = route as RouteWithCompiledPath;

  const prefixIsString = typeof pathPrefix === "string";
  const routePathIsString = typeof route.path === "string";

  if (prefixIsString && routePathIsString) {
    let pathSuffix = route.path as string;
    const suffixStartsWithSlash = pathSuffix[0] === "/";
    const prefixEndsWithSlash = pathPrefix.endsWith("/");
    if (suffixStartsWithSlash && prefixEndsWithSlash) {
      pathSuffix = pathSuffix.slice(1);
    } else if (!suffixStartsWithSlash && !prefixEndsWithSlash) {
      pathSuffix = "/" + pathSuffix;
    }

    newRoute.compiledPath = pathPrefix + pathSuffix;
  } else {
    let source = "";

    source += prefixIsString
      ? escapeStringRegexp(pathPrefix)
      : pathPrefix.source;
    source += routePathIsString
      ? escapeStringRegexp(route.path as string)
      : (route.path as RegExp).source;

    newRoute.compiledPath = new RegExp("^" + source + "/?");
  }
}

export function findLocation(
  routes: (Route | RouteWithCompiledPath)[],
  path: string,
) {
  async function checkPath(
    routes: readonly (Route | RouteWithCompiledPath)[],
    pathPrefix: string | RegExp = "",
  ): Promise<[Route, RegExpMatchArray | null] | undefined> {
    for (const route of routes) {
      let routeMatches: boolean;
      let fullMatch: boolean;
      let regExpMatch = null;

      if (!hasCompiledPathForRoute(route)) {
        compilePath(route, pathPrefix);
      }

      const fullPath = (route as RouteWithCompiledPath).compiledPath;
      if (typeof fullPath === "string") {
        routeMatches = path.startsWith(fullPath);
        fullMatch =
          routeMatches && (fullPath === path || fullPath + "/" === path);
      } else {
        regExpMatch = path.match(fullPath);
        routeMatches = !!regExpMatch;
        fullMatch = routeMatches && regExpMatch![0] === path;
      }

      if (!routeMatches) {
        continue;
      }

      const guardChildren =
        (!route.children?.length && !fullMatch) ||
        !route.guardChildren ||
        route.guardChildren(regExpMatch);
      if (
        (guardChildren instanceof Promise && !(await guardChildren)) ||
        !guardChildren
      ) {
        continue;
      }

      if (fullMatch) {
        const guard = !route.guard || route.guard(regExpMatch);
        if ((guard instanceof Promise && !(await guard)) || !guard) {
          continue;
        }

        return [route, regExpMatch];
      } else if ("children" in route && route.children?.length) {
        const match = await checkPath(route.children, fullPath!);
        if (match) {
          return match;
        }
      }
    }
  }

  return checkPath(routes).then((routeMatch) => {
    if (!routeMatch) {
      throw new Error("path not found");
    }

    return routeMatch;
  });
}
