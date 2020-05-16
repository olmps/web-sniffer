export enum ErrorType {
  unexpectedType = "Unexpected Type",
  denied = "Denied Content",
  unknown = "Unknown Error"
}

export default class ProxyError extends Error {
  type: ErrorType
  original?: Error

  get code(): number {
    switch (this.type) {
      case ErrorType.unknown: return 0
      case ErrorType.unexpectedType: return 1
      case ErrorType.denied: return 2
    }
  }

  constructor(message: string, type: ErrorType, original?: Error) {
    super(message)
    this.type = type
    this.original = original
  }
}