import 'server-only';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  msg: string;
  timestamp: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function emit(entry: LogEntry): void {
  const { level, ...rest } = entry;
  const json = JSON.stringify(rest);
  switch (level) {
    case 'error':
      console.error(json);
      break;
    case 'warn':
      console.warn(json);
      break;
    default:
      console.log(json);
  }
}

function createLogFn(level: LogLevel) {
  return (msg: string, context: Record<string, unknown> = {}) => {
    if (!shouldLog(level)) return;
    emit({ level, msg, timestamp: new Date().toISOString(), ...context });
  };
}

export const logger = {
  debug: createLogFn('debug'),
  info: createLogFn('info'),
  warn: createLogFn('warn'),
  error: createLogFn('error'),

  child(defaults: Record<string, unknown>) {
    return {
      debug: (msg: string, ctx: Record<string, unknown> = {}) =>
        logger.debug(msg, { ...defaults, ...ctx }),
      info: (msg: string, ctx: Record<string, unknown> = {}) =>
        logger.info(msg, { ...defaults, ...ctx }),
      warn: (msg: string, ctx: Record<string, unknown> = {}) =>
        logger.warn(msg, { ...defaults, ...ctx }),
      error: (msg: string, ctx: Record<string, unknown> = {}) =>
        logger.error(msg, { ...defaults, ...ctx }),
    };
  },
};
