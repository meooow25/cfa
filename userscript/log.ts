type LogFn = (...args: unknown[]) => void;

const wrap = (f: LogFn) => (...args: unknown[]) => f("[cfa]", ...args);
const noopFn = () => {};

type MinLevel = "DEBUG" | "INFO" | "INF";

/** Logger that logs to the console with a prefix. */
export class Logger {
  debug!: LogFn;
  info!: LogFn;
  error!: LogFn;

  constructor() {
    this.setMinLevel("INF");
  }

  setMinLevel(level: MinLevel) {
    const debugOn = level === "DEBUG";
    const infoErrorOn = debugOn || level === "INFO";

    this.debug = debugOn ? wrap(console.debug) : noopFn;
    this.info = infoErrorOn ? wrap(console.info) : noopFn;
    this.error = infoErrorOn ? wrap(console.error) : noopFn;
  }
}

const logger = new Logger();

/** Returns the logger. Does not log by default, use setMinLevel first. */
export function getLogger(): Logger {
  return logger;
}
