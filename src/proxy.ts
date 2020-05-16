import { EventEmitter } from 'events'

import HttpServer from './httpServer'
import HttpsServer from './httpsServer'
import { ProxyOptions, IRequest, IResponse } from './models'

interface InterceptOptions { phase: Phase }
type Phase = 'request' | 'response'

type AnyContent = IRequest | IResponse
type InterceptHandler = (request: IRequest, response: IResponse) => Promise<AnyContent>

export default class Proxy extends EventEmitter {

  httpServer: HttpServer // HttpProxy
  httpsServer?: HttpsServer // HttpsProxy
  interceptors: Map<string, InterceptHandler>
  options: ProxyOptions

  constructor(options: ProxyOptions) {
    super()
    this.options = options
    this.interceptors = new Map<string, InterceptHandler>()
    this.httpServer = new HttpServer((phase, request, response) => this.onIntercept(phase, request, response))
    if (options.certAuthority !== undefined) {
      this.httpsServer = new HttpsServer(options.certAuthority, this.httpServer.server)
    }
    this.forwardEvents()
  }

  private forwardEvents() {
    this.httpServer.on('error', (error: any) => this.emit(error))
    this.httpsServer?.on('error', (error: any) => this.emit(error))
  }

  async onIntercept(phase: string, request: IRequest, response: IResponse): Promise<IRequest | IResponse> {
    const handler = this.interceptors.get(phase)
    if (!handler) {
      const content = phase === 'request' ? request : response
      return Promise.resolve(content)
    }
    const modifiedContent = await handler(request, response)
    return Promise.resolve(modifiedContent)
  }

  intercept(options: InterceptOptions, handler: InterceptHandler) {
    this.interceptors.set(options.phase, handler)
  }

  listen(port: number) {
    this.httpServer.listen(port)
    if (this.httpsServer) { this.httpsServer.listen() }
  }

  close() {
    this.httpServer.close()
    this.httpsServer?.close()
  }
}