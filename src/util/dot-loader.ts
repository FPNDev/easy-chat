import { text } from '../local_modules/util/html';

export function dotLoaderFactory(initialDotCount = 3, prefix = '', className = '') {
  const node = text();

  let dotCount: number;
  let loaderInterval: number | null;

  const reset = () => {
    dotCount = 0;
    draw();
  };
  const draw = () => {
    node.textContent = prefix + '.'.repeat(dotCount + 1);
  };

  reset();

  return {
    start: () => {
      loaderInterval = setInterval(() => {
        dotCount = (dotCount + 1) % initialDotCount;
        draw();
      }, 500);
    },
    stop: () => {
      if (loaderInterval) {
        reset();
        clearInterval(loaderInterval);
        loaderInterval = null;
      }
    },
    node,
  };
}
