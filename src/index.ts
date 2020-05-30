import { ProxyOptions } from './models'
import { Proxy } from './proxy'

export { IRequest, IResponse, CertAuthority, ProxyOptions } from './models'
export { ProxyError } from './errors'
export { Proxy }
export function createServer(options: ProxyOptions) { return new Proxy(options) }