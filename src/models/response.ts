import { IncomingMessage } from "http"
import RequestModel from "./request-model"

export interface IResponse {
  statusCode: number
  headers: Record<string, string>
  body: Buffer
  remoteAddress: string
  size: number
  [key: string]: any
}

export class Response extends RequestModel implements IResponse {
  statusCode: number

  constructor() {
    super()
    this.statusCode = 200
  }

  populate(httpResponse: IncomingMessage) {
    const { headers, statusCode, httpVersion, socket } = httpResponse

    this.statusCode = statusCode!
    this.headers = this.formattedHeaders(headers)
    this.httpVersion = httpVersion
    this.remoteAddress = socket.remoteAddress ?? ""
    this.size = this.calculateSize(httpResponse)
  }
}