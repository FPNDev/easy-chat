export function moduleDefault<T>(imp: Promise<{ default: T }>) {
  return imp.then((m) => m.default);
}