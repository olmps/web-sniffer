import { IncomingHttpHeaders } from "http"

export default class RequestModel {
  headers: Map<string, string>
  body: string

  get httpHeaders(): IncomingHttpHeaders {
    const formattedHeaders: any = { }
    this.headers.forEach((value, key) => {
      formattedHeaders[key] = value
    })
    return formattedHeaders
  }

  constructor(headers: IncomingHttpHeaders = { }, body: string = '') {
    this.headers = this.formattedHeaders(headers)
    this.body = body
  }

  protected formattedHeaders(headers: IncomingHttpHeaders): Map<string, string> {
    const headersDictionary = new Map<string, string>()
    for (const key of Object.keys(headers)) {
      const value = headers[key]
      if (value === undefined) { continue }
      if (typeof value === 'string') {
        headersDictionary.set(key, value)
      } else { // TODO: TEST SET-COOKIE CASE
        headersDictionary.set(key, value.toString())
      }
    }

    return headersDictionary
  }
}