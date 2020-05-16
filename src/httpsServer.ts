import { EventEmitter } from 'events'
import * as net from 'net'
import * as http from 'http'
import * as https from 'https'
import * as tls from 'tls'

import CertificateHandler from './certificateHandler'
import { CertAuthority } from './models'
import Server from './server'

type CertificateCreationCallback = (error: any | null, secureContext: tls.SecureContext) => void

export default class HttpsServer extends EventEmitter {

  certificateHandler: CertificateHandler
  httpServer: http.Server
  server: https.Server

  constructor(certAuthority: CertAuthority, httpServer: http.Server) {
    super()
    this.certificateHandler = new CertificateHandler(certAuthority.cert, certAuthority.key)
    this.httpServer = httpServer
    this.server = this.startHttpsServer()
  }
  
  startHttpsServer() {
    const { rootCertKey: key, rootCert: cert } = this.certificateHandler
    this.bridgeHttpConnection()

    const certificateCallback = (serverName: string, callback: CertificateCreationCallback) => {
      this.certificateHandler.getSecureTlsConnection(serverName, callback)
    }
    
    const server = https.createServer({ key, cert, SNICallback: certificateCallback }, (fromClient, toClient) => {

      const shp = 'https://' + fromClient.headers.host
      const fullUrl = shp + fromClient.url
      const destination = this.httpServer.address() as net.AddressInfo

      // Redirect this HTTPS request to `httpServer` so it can handle it.
      let toServer = http.request({
        host: 'localhost',
        port: destination.port,
        method: fromClient.method,
        path: fullUrl,
        headers: fromClient.headers,
      }, fromServer => {
        toClient.writeHead(fromServer.statusCode!, fromServer.headers)
        fromServer.pipe(toClient)
        toServer.end()
      })
      
      toServer.on('error', (err) => this.emit('error', err))
      fromClient.pipe(toServer)
    })

    server.on('error', (error: any) => this.emit('error', error))

    return server
  }

  listen() {
    this.server.listen(0, 'localhost')
  }

  close() {
    this.server.close()
  }

  private bridgeHttpConnection() {
    this.httpServer.on('connect', (request, clientSocket, head) => {
      let addr = this.server.address() as net.AddressInfo
      // Creates TCP connection to HTTPS server
      let serverSocket = net.connect(addr.port, addr.address, () => {
        const successConnection = new Buffer(`HTTP/${request.httpVersion} 200 Connection Established\r\n\r\n`, 'utf-8')
        // Tell the client (the HTTP server) that the connection was successfully established
        clientSocket.write(successConnection)
        clientSocket
          .pipe(serverSocket)
          .pipe(clientSocket)
      })
    })
  }
}