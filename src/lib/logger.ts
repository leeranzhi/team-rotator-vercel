type LogLevel = 'info' | 'warn' | 'error';

interface Logger {
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any>): void;
}

function formatMessage(level: LogLevel, message: string, context?: Record<string, any>): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `${timestamp} [${level}] ${message}${contextStr}`;
}

export const logger: Logger = {
  info(message: string, context?: Record<string, any>) {
    console.log(formatMessage('info', message, context));
  },
  warn(message: string, context?: Record<string, any>) {
    console.warn(formatMessage('warn', message, context));
  },
  error(message: string, context?: Record<string, any>) {
    console.error(formatMessage('error', message, context));
  },
}; 