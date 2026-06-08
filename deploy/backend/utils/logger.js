function timestamp() {
  return new Date().toISOString();
}

export function info(message, meta = {}) {
  console.log(`${timestamp()} INFO ${message}`, meta);
}

export function warn(message, meta = {}) {
  console.warn(`${timestamp()} WARN ${message}`, meta);
}

export function error(message, meta = {}) {
  console.error(`${timestamp()} ERROR ${message}`, meta);
}

export function debug(message, meta = {}) {
  if (process.env.DEBUG_LOGS === 'true') {
    console.debug(`${timestamp()} DEBUG ${message}`, meta);
  }
}

export default { info, warn, error, debug };
