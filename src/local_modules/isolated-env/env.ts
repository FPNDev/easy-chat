const envStack: symbol[] = [];
let currentEnv: symbol | undefined;

function isolateEnv(env: symbol) {
  removeEnvFromStack(env);
  envStack.push(env);
  currentEnv = env;
}
function getIsolatedEnv() {
  return currentEnv;
}
function removeEnvFromStack(env: symbol) {
  const idx = envStack.indexOf(env);
  if (idx !== -1) {
    envStack.splice(idx, 1);
  }
}

function disposeEnv(env: symbol) {
  removeEnvFromStack(env);
  if (currentEnv === env) {
    currentEnv = envStack.at(-1);
  }
}

function isEnv(env: symbol) {
  return envStack.includes(env);
}

export { isolateEnv, getIsolatedEnv, disposeEnv, isEnv };
