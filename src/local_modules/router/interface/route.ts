export type Route = {
  path: string | RegExp;
  guard?(queryParams: RegExpMatchArray | null):  Promise<unknown> | unknown;
  guardChildren?(queryParams: RegExpMatchArray | null): Promise<unknown> | unknown;
  children?: readonly Route[];
  aliasOf?: Route;
};

export type RouteWithCompiledPath = Route & {
  compiledPath: string | RegExp;
};

export function hasCompiledPathForRoute(r: Route): r is RouteWithCompiledPath {
  return 'compiledPath' in r;
}
