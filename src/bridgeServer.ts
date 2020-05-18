import * as http from 'http'
import * as net from 'net'
import { EventEmitter } from 'events'

import HttpServer from "./httpServer";
import HttpsServer from "./httpsServer";
import { IRequest, IResponse, CertAuthority } from "./models";

type AnyContent = IRequest | IResponse
type InterceptHandler = (phase: string, request: IRequest, response: IResponse) => Promise<AnyContent>
interface PortOptions {
  bridgePort: number
  httpPort?: number
  httpsPort?: number
}

export default class BridgeServer extends EventEmitter {
  bridgeServer: http.Server
  httpServer: HttpServer
  httpsServer?: HttpsServer

  constructor(interceptHandler: InterceptHandler, certAuthority?: CertAuthority) {
    super()
    this.bridgeServer = this.createBridgeServer()
    this.httpServer = new HttpServer(interceptHandler)
    if (certAuthority) {
      const httpsServer = new HttpsServer(certAuthority, interceptHandler)
      this.httpsServer = httpsServer
      this.createHttpsBridge(httpsServer)
    }
    this.forwardErrors()
  }

  private createBridgeServer() {
    const bridgeServer = http.createServer((req, res) => {
      const httpServerAddress = this.httpServer.address as net.AddressInfo

      const requestTarget = {
        host: 'localhost',
        port: httpServerAddress.port,
        path: req.url,
        method: req.method,
        headers: req.headers
      }

      const forwardRequest = http.request(requestTarget, (httpServerResponse) => {
        res.writeHead(httpServerResponse.statusCode!, httpServerResponse.headers)
        httpServerResponse.pipe(res)
      })

      req.pipe(forwardRequest)
      forwardRequest.on('error', (err) => this.emit('error', err))
    })
    
    return bridgeServer
  }

  private forwardErrors() {
    this.bridgeServer.on('error', (error: any) => this.emit('error', error))
    this.httpServer.on('error', (error: any) => this.emit('error', error))
    this.httpsServer?.on('error', (error: any) => this.emit('error', error))
  }

  private createHttpsBridge(httpsServer: HttpsServer) {
    this.bridgeServer.on('connect', (request, clientSocket, _) => {
      const address = httpsServer.address as net.AddressInfo
      // Creates TCP connection to the target server
      let serverSocket = net.connect(address.port, address.address, () => {
        const successConnection = Buffer.from(`HTTP/${request.httpVersion} 200 Connection Established\r\n\r\n`, 'utf-8')
        // Tell the client (the HTTP server) that the connection was successfully established
        clientSocket.write(successConnection)
        clientSocket
          .pipe(serverSocket)
          .pipe(clientSocket)
      })

      serverSocket.on('error', (err) => this.emit('error', err))
      clientSocket.on('error', () => {}) // Ignore ECONNRESET ERRORS THAT ARE HANDLED BY THE ABOVE HTTP PROXY
    })
  }

  listen(port: number | PortOptions) {
    if (typeof port === 'number') {
      this.bridgeServer.listen(port)
      this.httpServer.listen(0)
      this.httpsServer?.listen(0)
    } else {
      this.bridgeServer.listen(port.bridgePort)
      this.httpServer.listen(port.httpPort ?? 0)
      this.httpsServer?.listen(port.httpsPort ?? 0)
    }
  }

  close() {
    this.bridgeServer.close()
    this.httpServer.close()
    this.httpsServer?.close()
  }
}