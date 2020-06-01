import * as url from 'url'
import { IncomingMessage } from "http"
import RequestModel, { HeaderValue } from "./request-model"

export interface IRequest {
  protocol: string
  hostname: string
  method: string
  url: string
  query: any
  headers: Record<string, HeaderValue>
  body: Buffer
  remoteAddress: string
  size: number
  [key: string]: any
}

export class Request extends RequestModel implements IRequest {
  protocol: string
  method: string
  url: string
  query: any

  get fullUrl(): string { return `${this.protocol}//${this.hostname}${this.url}` }
  get hostname(): string {
    const hostHeader = this.headers.host as string
    return hostHeader
  }

  constructor(httpRequest: IncomingMessage, protocol: string) {
    const { method, url: requestUrl, socket } = httpRequest

    super(httpRequest)
    this.protocol = protocol
    this.method = method!
    this.url = url.parse(requestUrl!).path ?? ""
    this.query = url.parse(requestUrl!, true).query
    this.remoteAddress = socket.remoteAddress ?? ""
  }
}