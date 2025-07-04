interface LogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'error' | 'warn';
}

class MemoryLogger {
  private logs: LogEntry[] = [];
  private maxSize = 2 * 1024 * 1024; // 2MB
  private currentSize = 0;

  private calculateSize(entry: LogEntry): number {
    // 粗略计算日志条目的大小（以字节为单位）
    return JSON.stringify(entry).length;
  }

  private trimLogsIfNeeded() {
    while (this.currentSize > this.maxSize && this.logs.length > 0) {
      const removedEntry = this.logs.shift();
      if (removedEntry) {
        this.currentSize -= this.calculateSize(removedEntry);
      }
    }
  }

  log(message: string, level: LogEntry['level'] = 'info') {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      message,
      level
    };

    this.currentSize += this.calculateSize(entry);
    this.logs.push(entry);
    this.trimLogsIfNeeded();
  }

  info(message: string) {
    this.log(message, 'info');
  }

  error(message: string) {
    this.log(message, 'error');
  }

  warn(message: string) {
    this.log(message, 'warn');
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.currentSize = 0;
  }

  getCurrentSize(): number {
    return this.currentSize;
  }
}

// 创建单例实例
export const logger = new MemoryLogger(); 