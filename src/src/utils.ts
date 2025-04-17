export const throttle = <T extends (...args: unknown[]) => void>(func: T, limit: number) => {
  let lastRun = 0;
  let throttled = false;
  
  return function(...args: Parameters<T>) {
    if (!throttled) {
      func.apply(this, args);
      lastRun = Date.now();
      throttled = true;
      
      setTimeout(() => {
        throttled = false;
      }, limit);
    }
  };
};
  