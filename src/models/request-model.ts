import { IncomingMessage, IncomingHttpHeaders } from "http"

export default class RequestModel {
  httpVersion: string
  headers: Record<string, string>
  remoteAddress: string
  size: number

  body: Buffer
  get stringBody(): string { return this.body.toString('utf-8') }
  set stringBody(newBody: string) { this.body = new Buffer(newBody, 'utf-8') }

  constructor(incomingMessage: IncomingMessage | undefined = undefined) {
    this.httpVersion = incomingMessage?.httpVersion ?? ""
    this.headers = this.formattedHeaders(incomingMessage?.headers ?? { })
    this.body = Buffer.from('')
    this.remoteAddress = ''
    this.size = incomingMessage ? this.calculateSize(incomingMessage) : 0
  }

  protected formattedHeaders(headers: IncomingHttpHeaders): Record<string, string> {
    const headersDictionary: Record<string, string> = { }
    for (const key of Object.keys(headers)) {
      const value = headers[key]
      if (value === undefined) { continue }
      if (typeof value === 'string') {
        headersDictionary[key] = value
      } else { // TODO: TEST SET-COOKIE CASE
        headersDictionary[key] = value.toString()
      }
    }

    return headersDictionary
  }

  /**
   * Socket connections may be reused. It means that `connection.bytesRead` may have the size
   * from the last executed request. This workarounds calculate the difference from this size
   * to get the size of the specific request/response
   */
  protected calculateSize(incomingMessage: IncomingMessage): number {
    const requestConnection: any = incomingMessage.connection

    const bytesReadPreviously = requestConnection._requestStats ? requestConnection._requestStats.bytesRead : 0
    const bytesReadDelta = requestConnection.bytesRead - bytesReadPreviously

    requestConnection._requestStats = {
      bytesRead: requestConnection.bytesRead,
      bytesWritten: requestConnection.bytesWritten
    }


    return bytesReadDelta
  }
}