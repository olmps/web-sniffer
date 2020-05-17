import { IncomingMessage, IncomingHttpHeaders } from "http"
import { Socket } from 'net'

export default class RequestModel {
  httpVersion: string
  headers: Record<string, string>
  body: string
  socket: Socket

  constructor(incomingMessage: IncomingMessage | undefined = undefined) {
    this.httpVersion = incomingMessage?.httpVersion ?? ""
    this.headers = this.formattedHeaders(incomingMessage?.headers ?? { })
    this.body = ''
    this.socket = incomingMessage?.socket ?? { } as Socket
  }

  protected formattedHeaders(headers: IncomingHttpHeaders): Record<string, string> {
    const headersDictionary: Record<string, string> = { }
    for (const key of Object.keys(headers)) {
      const value = headers[key]
      if (value === undefined) { continue }
      if (value.includes('gzip')) { continue } // TODO: HANDLE GZIP
      if (typeof value === 'string') {
        headersDictionary[key] = value
      } else { // TODO: TEST SET-COOKIE CASE
        headersDictionary[key] = value.toString()
      }
    }

    return headersDictionary
  }
}