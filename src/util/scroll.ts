export function isScrolledToBottom(element?: HTMLElement) {
  if (!element) {
    return false;
  }
  return (
    Math.ceil(element.scrollTop + element.offsetHeight) === element.scrollHeight
  );
}
