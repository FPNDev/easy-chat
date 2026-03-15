import { disposeEnv, isolateEnv } from './env';

function isolateViewOnFocus(node: HTMLElement) {
  const focusCapture = Symbol();
  node.addEventListener(
    'focus',
    () => {
      isolateEnv(focusCapture);
    },
    { capture: true },
  );
  node.addEventListener(
    'blur',
    () => {
      disposeEnv(focusCapture);
    },
    { capture: true },
  );
  
  return focusCapture;
}

export { isolateViewOnFocus };
