type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
}

interface Logger {
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any>): void;
  getLogs(): LogEntry[];
  clear(): void;
}

// Store logs in memory (note: logs will be cleared on server restart)
let logs: LogEntry[] = [];

function formatMessage(level: LogLevel, message: string, context?: Record<string, any>): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `${timestamp} [${level}] ${message}${contextStr}`;
}

function addLog(level: LogLevel, message: string, context?: Record<string, any>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };
  logs.push(entry);

  // Format for Vercel's logging system
  const formattedMsg = formatMessage(level, message, context);
  
  // Use Vercel's logging system if available
  if (process.env.VERCEL) {
    switch (level) {
      case 'info':
        console.log(formattedMsg);
        break;
      case 'warn':
        console.warn(formattedMsg);
        break;
      case 'error':
        console.error(formattedMsg);
        break;
    }
  } else {
    // Local development logging
    switch (level) {
      case 'info':
        console.log(formattedMsg);
        break;
      case 'warn':
        console.warn(formattedMsg);
        break;
      case 'error':
        console.error(formattedMsg);
        break;
    }
  }
}

export const logger: Logger = {
  info(message: string, context?: Record<string, any>) {
    addLog('info', message, context);
  },
  warn(message: string, context?: Record<string, any>) {
    addLog('warn', message, context);
  },
  error(message: string, context?: Record<string, any>) {
    addLog('error', message, context);
  },
  getLogs() {
    return [...logs]; // Return a copy to prevent external modification
  },
  clear() {
    logs = [];
  },
}; 