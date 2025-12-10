// logger.ts
type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  silent: 5, // No logging
};

class Logger {
  private logLevel: LogLevel;

  constructor(logLevel: LogLevel = "info") {
    this.logLevel = logLevel;
  }

  setLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.logLevel];
  }

  debug(...args: any[]) {
    if (this.shouldLog("debug")) console.debug("[DEBUG]", ...args);
  }

  info(...args: any[]) {
    if (this.shouldLog("info")) console.info("[INFO]", ...args);
  }

  warn(...args: any[]) {
    if (this.shouldLog("warn")) console.warn("[WARN]", ...args);
  }

  error(...args: any[]) {
    if (this.shouldLog("error")) console.error("[ERROR]", ...args);
  }
}

// Initialize with default level from environment
const defaultLogLevel = ("info") as LogLevel;
const logger = new Logger(defaultLogLevel);

export default logger;
