import { IncomingMessage, IncomingHttpHeaders } from "http"

export default class RequestModel {
  httpVersion: string
  headers: Record<string, string>
  remoteAddress: string

  body: Buffer
  get stringBody(): string { return this.body.toString('utf-8') }
  set stringBody(newBody: string) { this.body = new Buffer(newBody, 'utf-8') }

  constructor(incomingMessage: IncomingMessage | undefined = undefined) {
    this.httpVersion = incomingMessage?.httpVersion ?? ""
    this.headers = this.formattedHeaders(incomingMessage?.headers ?? { })
    this.body = Buffer.from('')
    this.remoteAddress = ''
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
}