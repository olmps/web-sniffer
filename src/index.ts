import { ProxyOptions } from './models'
import { Proxy } from './proxy'

export { IRequest, IResponse, CertAuthority, ProxyOptions } from './models'
export { ProxyError } from './errors'
export { Proxy }
export function createServer(options: ProxyOptions) { return new Proxy(options) }

// import * as fs from 'fs'

// try {
//   const proxy = createServer({
//     certAuthority: {
//       cert: fs.readFileSync('./resources/proxy-cert.crt.pem'),
//       key: fs.readFileSync('./resources/proxy-cert-key.key.pem')
//     }
//   })
  
//   proxy.on('error', (error: any) => {
//     console.error(error)
//   })
  
//   proxy.on('log', (log: any) => {
//     console.log(log)
//   })

//   proxy.intercept({ phase: 'request' }, (req, res) => {
//     for (let index = 0; index < 10000; index++) { }
//     return Promise.resolve(req)
//   })
  
//   proxy.listen(8888)
// } catch (error) {
//   console.error(error)
// }