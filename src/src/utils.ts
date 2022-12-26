export const throttle = (func, limit) => {
    let inThrottle
    return (...args) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = setTimeout(() => inThrottle = false, limit)
      }
    }
  }
  