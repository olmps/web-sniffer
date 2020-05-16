export interface IResponse {
  statusCode: number
  headers: Map<string, string>
  body: string
  [key: string]: any
}

export class Response implements IResponse {
  statusCode: number
  headers: Map<string, string>
  body: string

  constructor(statusCode: number, headers: Map<string, string>, body: string) {
    this.statusCode = statusCode
    this.headers = headers
    this.body = body
  }
}