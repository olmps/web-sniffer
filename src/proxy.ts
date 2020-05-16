import { EventEmitter } from 'events'

import HttpServer from './httpServer'
import HttpsServer from './httpsServer'
import { ProxyOptions, IRequest, IResponse } from './models'
import { request } from 'http'

export default class Proxy extends EventEmitter {

  httpServer: HttpServer // HttpProxy
  httpsServer?: HttpsServer // HttpsProxy
  options: ProxyOptions

  constructor(options: ProxyOptions) {
    super()
    this.options = options
    this.httpServer = new HttpServer()
    if (options.certAuthority !== undefined) {
      this.httpsServer = new HttpsServer(options.certAuthority, this.httpServer.server)
    }
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