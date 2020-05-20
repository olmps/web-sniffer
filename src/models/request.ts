import * as url from 'url'
import { IncomingMessage } from "http"
import RequestModel from "./request-model"

export interface IRequest {
  protocol: string
  hostname: string
  method: string
  url: string
  query: any
  headers: Record<string, string>
  body: Buffer
  remoteAddress: string
  [key: string]: any
}

export class Request extends RequestModel implements IRequest {
  protocol: string
  method: string
  url: string
  query: any

  get fullUrl(): string { return `${this.protocol}//${this.hostname}${this.url}` }
  get hostname(): string { return this.headers.host }

  constructor(httpRequest: IncomingMessage, protocol: string) {
    const { method, url: requestUrl, socket } = httpRequest

    super(httpRequest)
    this.protocol = protocol
    this.method = method!
    this.url = requestUrl!
    this.query = url.parse(requestUrl!, true).query
    this.remoteAddress = socket.remoteAddress ?? ""
  }
}