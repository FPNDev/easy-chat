export function unsubscribeFactory(
  onUnsubscribe: () => void,
  pool: Array<() => void>,
) {
  let unsubscribeAction: (() => void) | undefined = onUnsubscribe;
  const poolUnsubscribe = () => {
    if (unsubscribeAction) {
      unsubscribeAction();
      unsubscribeAction = undefined;
      
      const index = pool.indexOf(poolUnsubscribe);
      if (index !== -1) {
        pool.splice(index, 1);
      }
    }
  };
  pool.push(poolUnsubscribe);

  return poolUnsubscribe;
}
