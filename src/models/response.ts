import { IncomingMessage } from "http"
import RequestModel from "./request-model"

export interface IResponse {
  statusCode: number
  headers: Map<string, string>
  body: string
  [key: string]: any
}

export class Response extends RequestModel implements IResponse {
  statusCode: number

  constructor() {
    super()
    this.statusCode = 200
  }

  populate(httpResponse: IncomingMessage) {
    const { headers, statusCode, httpVersion } = httpResponse

    this.statusCode = statusCode!
    this.headers = this.formattedHeaders(headers)
    this.httpVersion = httpVersion
  }
}