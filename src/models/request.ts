import { IncomingHttpHeaders, IncomingMessage } from "http"
import * as url from 'url'
import RequestModel from "./request-model"

export interface IRequest {
  protocol: string
  hostname: string
  port: number
  method: string
  url: string
  query: any
  headers: Map<string, string>
  body: string
  [key: string]: any
}

export class Request extends RequestModel implements IRequest {
  method: string
  url: string
  query: any

  get fullUrl(): string { return `${this.protocol}//${this.hostname}${this.url}` }
  get protocol(): string { return url.parse(this.url).protocol! }
  get hostname(): string { return url.parse(this.url).hostname! }
  get port(): number { return Number(url.parse(this.url).port) }

  constructor(httpRequest: IncomingMessage) {
    super(httpRequest.headers)
    this.method = httpRequest.method!
    this.url = httpRequest.url!
    this.query = url.parse(httpRequest.url!, true)
  }
}