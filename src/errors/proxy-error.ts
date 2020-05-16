export enum ErrorType {
  unexpectedType = "Unexpected Type",
  unknown = "Unknown Error"
}

export default class ProxyError {
  message: string
  type: ErrorType
  original?: Error

  get code(): number {
    switch (this.type) {
      case ErrorType.unknown: return 0
      case ErrorType.unexpectedType: return 1
    }
  }

  constructor(message: string, type: ErrorType, original?: Error) {
    this.message = message
    this.type = type
    this.original = original
  }
}