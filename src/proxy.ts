import { EventEmitter } from 'events'
import * as net from 'net'

import HttpServer from './httpServer'
import HttpsServer from './httpsServer'
import { ProxyOptions, IRequest, IResponse } from './models'
import ProxyError from './errors/proxy-error'

interface InterceptOptions { phase: Phase }
type Phase = 'request' | 'response'

type AnyContent = IRequest | IResponse
type InterceptHandler = (request: IRequest, response: IResponse) => Promise<AnyContent>

export default class Proxy extends EventEmitter {

  private httpServer: HttpServer
  private httpsServer?: HttpsServer
  private interceptors: Map<string, InterceptHandler>
  private options: ProxyOptions

  constructor(options: ProxyOptions) {
    super()
    this.options = options
    this.interceptors = new Map<string, InterceptHandler>()
    this.httpServer = new HttpServer((phase, request, response) => this.onIntercept(phase, request, response))
    if (options.certAuthority !== undefined) {
      const httpAddressGetter = () => { return this.httpServer.address }
      this.httpsServer = new HttpsServer(options.certAuthority, httpAddressGetter)
      this.bridgeProxies()
    }
    this.forwardEvents()
  }

  /**
   * Creates a bridge between HTTPS and HTTP proxies.
   * 
   * This lets the HTTPS requests be handled by HttpsServer and
   * HTTP requests be handled by HttpServer.
   */
  private bridgeProxies() {
    this.httpServer.on('connect', (request, clientSocket, _) => {
      let addr = this.httpsServer!.address
      // Creates TCP connection to HTTPS server
      let serverSocket = net.connect(addr.port, addr.address, () => {
        const successConnection = Buffer.from(`HTTP/${request.httpVersion} 200 Connection Established\r\n\r\n`, 'utf-8')
        // Tell the client (the HTTP server) that the connection was successfully established
        clientSocket.write(successConnection)
        clientSocket
          .pipe(serverSocket)
          .pipe(clientSocket)
      })
    })
  }

  private forwardEvents() {
    this.httpServer.on('error', (error: ProxyError) => this.emit('error', error))
    this.httpsServer?.on('error', (error: ProxyError) => this.emit('error', error))
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