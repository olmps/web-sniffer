import * as http from 'http'
import { IRequest, IResponse } from './models'
import ProxyError, { ErrorType } from './errors/proxy-error'
import Server from './server'

type AnyContent = IRequest | IResponse
type InterceptHandler = (phase: string, request: IRequest, response: IResponse) => Promise<AnyContent>

export default class HttpServer extends Server {

  private server: http.Server

  get address() {
    return this.server.address()
  }

  constructor(interceptHandler: InterceptHandler) {
    super(interceptHandler)
    this.server = this.createServer()
  }

  private createServer() {
    const server = http.createServer(async (req, res) => this.sendRequest(req, res, 'http:'))
    server.on('error', (error: any) => this.emit('error', new ProxyError(error, ErrorType.unknown, error)))

    return server
  }

  listen(port: number) {
    this.server.listen(port)
  }

  close() {
    this.server.close()
  }
}