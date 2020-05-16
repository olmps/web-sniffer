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

export class Request implements IRequest {
  protocol: string
  hostname: string
  port: number
  method: string
  url: string
  query: any
  headers: Map<string, string>
  body: string

  get fullUrl(): string {
    return `${this.protocol}//${this.hostname}${this.url}`
  }

  constructor(protocol: string, hostname: string, port: number, method: string, url: string, query: any, headers: Map<string, string>, body: string) {
    this.protocol = protocol
    this.hostname = hostname
    this.port = port
    this.method = method
    this.url = url
    this.query = query
    this.headers = headers
    this.body = body
  }
}