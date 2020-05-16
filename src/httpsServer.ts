import { EventEmitter } from 'events'
import * as net from 'net'
import * as http from 'http'
import * as https from 'https'
import * as tls from 'tls'

import CertificateHandler from './certificateHandler'
import { CertAuthority } from './models'

type CertificateCreationCallback = (error: any | null, secureContext: tls.SecureContext) => void

export default class HttpsServer extends EventEmitter {

  private certificateHandler: CertificateHandler
  private server: https.Server

  get address(): net.AddressInfo {
    return this.server.address() as net.AddressInfo
  }

  constructor(certAuthority: CertAuthority, httpAddressGetter: () => net.AddressInfo) {
    super()
    this.certificateHandler = new CertificateHandler(certAuthority.cert, certAuthority.key)
    this.server = this.startHttpsServer(httpAddressGetter)
  }
  
  startHttpsServer(httpAddressGetter: () => net.AddressInfo) {
    const { rootCertKey: key, rootCert: cert } = this.certificateHandler

    const certificateCallback = (serverName: string, callback: CertificateCreationCallback) => {
      this.certificateHandler.getSecureTlsConnection(serverName, callback)
    }
    
    const server = https.createServer({ key, cert, SNICallback: certificateCallback }, (req, res) => {
      const fullUrl = `https://${req.headers.host}${req.url}`

      // Forward this HTTPS request to local HTTP server. See README to understand why this is made
      let toServer = http.request({
        host: 'localhost',
        port: httpAddressGetter().port,
        method: req.method,
        path: fullUrl,
        headers: req.headers,
      }, fromServer => {
        res.writeHead(fromServer.statusCode!, fromServer.headers)
        fromServer.pipe(res)
        toServer.end()
      })
      
      toServer.on('error', (err) => this.emit('error', err))
      req.pipe(toServer)
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
}