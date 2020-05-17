import * as https from 'https'
import * as tls from 'tls'

import CertificateHandler from './certificateHandler'
import { CertAuthority, IRequest, IResponse } from './models'
import ProxyError, { ErrorType } from './errors/proxy-error'
import Server from './server'

type CertificateCreationCallback = (error: any | null, secureContext: tls.SecureContext) => void
type AnyContent = IRequest | IResponse
type InterceptHandler = (phase: string, request: IRequest, response: IResponse) => Promise<AnyContent>

export default class HttpsServer extends Server {

  private certificateHandler: CertificateHandler
  private server: https.Server

  get address() {
    return this.server.address()
  }

  constructor(certAuthority: CertAuthority, interceptHandler: InterceptHandler) {
    super(interceptHandler)
    this.certificateHandler = new CertificateHandler(certAuthority.cert, certAuthority.key)
    this.server = this.startHttpsServer()
  }
  
  private startHttpsServer() {
    const { rootCertKey: key, rootCert: cert } = this.certificateHandler

    const certificateCallback = (serverName: string, callback: CertificateCreationCallback) => {
      this.certificateHandler.getSecureTlsConnection(serverName, callback)
    }
    
    const server = https.createServer({ key, cert, SNICallback: certificateCallback }, async (req, res) => this.sendRequest(req, res, 'https:'))
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