export enum ErrorType {
  // Hostname could not be resolved on destination IP address
  invalidHostname = "ENOTFOUND",
  // Connection abruptly closed.
  connectionReset = "ECONNRESET",
  inconsistency = "Inconsistency Error",
  unknown = "Unknown Error"
}

export default class ProxyError extends Error {
  type: ErrorType
  original?: Error

  get code(): number {
    switch (this.type) {
      case ErrorType.unknown: return 0
      case ErrorType.inconsistency: return 1
      case ErrorType.connectionReset: return 2
      case ErrorType.invalidHostname: return 3
    }
  }

  constructor(message: string, type: ErrorType, original?: Error) {
    super(message)
    this.type = type
    this.original = original
  }

  static from(error: any) {
    switch (error.code) {
      case 'ENOTFOUND': {
        const hostname: string = error.hostname
        const message = `Failed to resolve ${hostname} ip address`
        return new ProxyError(message, ErrorType.invalidHostname, error)
      }
      case 'ECONNRESET': {
        const message = `Connection was abruptly closed`
        return new ProxyError(message, ErrorType.connectionReset, error)
      }
      default: return new ProxyError(`Unknown error`, ErrorType.unknown, error)
    }
  }
}