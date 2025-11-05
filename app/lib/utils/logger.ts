type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.isDevelopment) return;

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: this.formatTimestamp(),
    };

    const prefix = `[${entry.timestamp}] [${level}]`;

    switch (level) {
      case 'ERROR':
        console.error(`${prefix} ${message}`, data);
        break;
      case 'WARN':
        console.warn(`${prefix} ${message}`, data);
        break;
      case 'DEBUG':
        console.debug(`${prefix} ${message}`, data);
        break;
      case 'INFO':
      default:
        console.info(`${prefix} ${message}`, data);
        break;
    }
  }

  info(message: string, data?: unknown): void {
    this.log('INFO', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('WARN', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('ERROR', message, data);
  }

  debug(message: string, data?: unknown): void {
    this.log('DEBUG', message, data);
  }
}

export const logger = new Logger();