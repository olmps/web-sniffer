import * as pem from 'pem'
import * as tls from 'tls'

type CertificateCreationCallback = (error: any | null, secureContext: tls.SecureContext) => void

export default class CertificateHandler {
  rootCert: string
  rootCertKey: string
  cache: Map<string, tls.SecureContext>

  constructor(rootCert: Buffer, rootCertKey: Buffer) {
    this.rootCert = rootCert.toString('utf8')
    this.rootCertKey = rootCertKey.toString('utf8')
    this.cache = new Map<string, tls.SecureContext>()
  }
  
  getSecureTlsConnection(serverName: string, callback: CertificateCreationCallback) {
    const cachedCertificate = this.cache.get(serverName)
    if (cachedCertificate) {
      callback(null, cachedCertificate)
      return
    }
    this.createCertificate(serverName, callback)
  }

  private createCertificate(serverName: string, callback: CertificateCreationCallback) {
    const certificateHandler = (error: any, result: any) => {
      if (error) {
        callback(error, { context: {} }) // TODO; REFACTOR THIS RETURN
        return
      }
      
      const { certificate, clientKey } = result
      const secureContext = tls.createSecureContext({key: clientKey, cert: certificate})

      callback(null, secureContext)
    }
    
    pem.createCertificate({
      country: 'US',
      state: 'Utah',
      locality: 'Provo',
      organization: 'ACME Tech Inc',
      commonName: serverName,
      altNames: [serverName],
      serviceKey: this.rootCertKey,
      serviceCertificate: this.rootCert,
      serial: Date.now(),
      days: 500,
    }, certificateHandler)
  }
}