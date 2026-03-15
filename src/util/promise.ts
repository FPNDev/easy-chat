export function retry<T>(
  fn: () => Promise<T>,
  tries = 3,
  timeout = 0,
): Promise<T> {
  return --tries
    ? fn().catch(() =>
        timeout
          ? delay(timeout).then(() => retry(fn, tries, timeout))
          : retry(fn, tries, timeout),
      )
    : fn();
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
